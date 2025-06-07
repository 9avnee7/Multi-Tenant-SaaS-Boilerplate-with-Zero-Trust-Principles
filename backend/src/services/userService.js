const { getTenantKnex } = require('../db');
const { getKeycloakAdmin } = require('../keycloak/admin');
const logger = require('../utils/logger');  // Assuming you have a logger module
const bcrypt = require('bcryptjs');

async function getUsers(tenantRealm) {
  const knex = getTenantKnex(tenantRealm);
  const [{ tenant_id }] = await knex('tenants').select('tenant_id').where({ name: tenantRealm });

  if (!tenant_id) {
    throw new Error(`Tenant not found: ${tenantRealm}`);
  }
  logger.info(`Fetching users for tenant: ${tenantRealm} (tenant_id: ${tenant_id})`);
  // Set RLS session variable for tenant_id
  await knex.raw(`SET app.tenant_id = '${tenant_id}'`);

  // Now query without explicit tenant filter, RLS will enforce filtering
  const users = await knex('users').select('*').where({ tenant_id });
  return users;

}

async function getUserById(tenantRealm, userId) {
  try {
    const knex = getTenantKnex(tenantRealm);
    const user = await knex('users').where({ user_id: userId }).first();
    if (!user) {
      const errMsg = `User with ID '${userId}' not found in tenant '${tenantRealm}'`;
      logger.warn(errMsg);
      throw new Error(errMsg);
    }
    return user;
  } catch (error) {
    logger.error(`Failed to fetch user '${userId}' for tenant '${tenantRealm}': ${error.message}`);
    throw new Error('Failed to fetch user');
  }
}

async function createUser(tenantRealm, userData) {
  const knex = getTenantKnex(tenantRealm);
  let keycloakAdmin;

  try {
    keycloakAdmin = await getKeycloakAdmin(tenantRealm);
    logger.info(`Keycloak admin authenticated for tenant '${tenantRealm}'`);
  } catch (error) {
    logger.error(`Failed to authenticate Keycloak admin for tenant '${tenantRealm}': ${error.message}`);
    throw new Error('Authentication error with Keycloak admin');
  }

  // Prepare Keycloak user payload
  const kcUser = {
    username: userData.email,
    email: userData.email,
    enabled: true,
    emailVerified: true,
    credentials: [{
      type: 'password',
      value: userData.password,
      temporary: false,
    }],
  };

  try {
    await keycloakAdmin.users.create({
      realm: tenantRealm,
      ...kcUser,
    });
    logger.info(`Created user '${userData.email}' in Keycloak realm '${tenantRealm}'`);
  } catch (err) {
    if (err.response?.status === 409) {
      const msg = `User with email '${userData.email}' already exists in realm '${tenantRealm}'`;
      logger.warn(msg);
      throw new Error(msg);
    }
    logger.error(`Failed to create user in Keycloak: ${err.message}`);
    throw new Error('Failed to create user in Keycloak');
  }

  // Retrieve Keycloak user ID
  let keycloakUserId;
  try {
    const users = await keycloakAdmin.users.find({
      realm: tenantRealm,
      username: userData.email,
    });

    if (!users || users.length === 0) {
      throw new Error(`Created user not found in Keycloak realm '${tenantRealm}'`);
    }

    keycloakUserId = users[0].id;
  } catch (err) {
    logger.error(`Failed to retrieve Keycloak user ID: ${err.message}`);
    throw new Error('Failed to retrieve created user from Keycloak');
  }

  // Assign roles in Keycloak
  try {
    const availableRoles = await keycloakAdmin.roles.find({ realm: tenantRealm });

    const rolesToAssign = (userData.roles || [])
      .map(roleName => availableRoles.find(r => r.name === roleName))
      .filter(Boolean);

    if (rolesToAssign.length === 0) {
      throw new Error(`No valid roles found for assignment in realm '${tenantRealm}'`);
    }

    await keycloakAdmin.users.addRealmRoleMappings({
      realm: tenantRealm,
      id: keycloakUserId,
      roles: rolesToAssign,
    });

    logger.info(`Assigned roles [${rolesToAssign.map(r => r.name).join(', ')}] to user '${userData.email}' in realm '${tenantRealm}'`);
  } catch (err) {
    logger.error(`Failed to assign roles to user in Keycloak: ${err.message}`);
    throw new Error('Failed to assign roles in Keycloak');
  }

  // Insert user into Postgres
  try {
    // Fetch tenant_id by tenantRealm name (assuming tenant name == realm)
    const tenantRow = await knex('tenants')
      .select('tenant_id')
      .where({ name: tenantRealm })
      .first();

    if (!tenantRow) {
      throw new Error(`Tenant '${tenantRealm}' not found`);
    }
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [newUser] = await knex('users')
      .insert({
        user_id: keycloakUserId,
        email: userData.email,
        password: hashedPassword,
        roles: userData.roles || [],
        tenant_id: tenantRow.tenant_id,
      })
      .returning('*');

    logger.info(`Inserted user '${userData.email}' into Postgres for tenant '${tenantRealm}'`);

    return newUser;
  } catch (err) {
    logger.error(`Failed to insert user into Postgres: ${err.message}`);
    throw new Error('Failed to insert user into database');
  }
}
async function updateUser(tenantRealm, userId, updateData) {
  const knex = getTenantKnex(tenantRealm);
  let keycloakAdmin;

  // Step 1: Authenticate Keycloak Admin
  try {
    keycloakAdmin = await getKeycloakAdmin(tenantRealm);
    logger.info(`Keycloak admin authenticated for tenant '${tenantRealm}'`);
  } catch (error) {
    logger.error(`Failed to authenticate Keycloak admin: ${error.message}`);
    throw new Error('Authentication with Keycloak failed');
  }

  // Step 2: Fetch existing Keycloak user by ID
  let kcUser;
  try {
    const users = await keycloakAdmin.users.find({ realm: tenantRealm, id: userId });
    if (!users || users.length === 0) {
      // fallback: fetch by username/email (safer: try by id first)
      const foundUsers = await keycloakAdmin.users.find({ realm: tenantRealm, username: updateData.email || updateData.oldEmail });
      if (!foundUsers || foundUsers.length === 0) {
        throw new Error(`User with ID or username not found in Keycloak`);
      }
      kcUser = foundUsers[0];
    } else {
      kcUser = users[0];
    }
  } catch (error) {
    logger.error(`Failed to fetch user from Keycloak: ${error.message}`);
    throw new Error('Failed to fetch user from Keycloak');
  }

  // Step 3: Prepare updated user payload (without password)
  const updatedUserPayload = {
    email: updateData.email || kcUser.email,
    username: updateData.email || kcUser.username,
    enabled: updateData.enabled !== undefined ? updateData.enabled : kcUser.enabled,
    emailVerified: updateData.emailVerified !== undefined ? updateData.emailVerified : kcUser.emailVerified,
    firstName: updateData.firstName || kcUser.firstName || '',
    lastName: updateData.lastName || kcUser.lastName || '',
  };

  // Step 4: Update user in Keycloak (excluding password)
  try {
    await keycloakAdmin.users.update({
      realm: tenantRealm,
      id: kcUser.id,
      body: updatedUserPayload,
    });
    logger.info(`Updated Keycloak user '${userId}' in realm '${tenantRealm}'`);
  } catch (error) {
    logger.error(`Failed to update Keycloak user: ${error.message}`);
    throw new Error('Failed to update user in Keycloak');
  }

  // Step 5: Reset password if provided (using resetPassword API)
  if (updateData.password) {
    try {
      logger.info(`Resetting password for user '${kcUser.id}'`);
      await keycloakAdmin.users.resetPassword({
        realm: tenantRealm,
        id: kcUser.id,
        credential: {
          type: 'password',
          value: updateData.password,
          temporary: false,
        }
      });
      logger.info(`Password reset for user '${kcUser.id}' successful`);
    } catch (error) {
      logger.error(`Failed to reset password: ${error.message}`);
      throw new Error('Failed to reset password in Keycloak');
    }
  }

  // Step 6: Update roles if provided
  if (updateData.roles && Array.isArray(updateData.roles)) {
    try {
      const availableRoles = await keycloakAdmin.roles.find({ realm: tenantRealm });

      // Map requested roles to full role objects
      const rolesToAssign = updateData.roles
        .map(roleName => availableRoles.find(r => r.name === roleName))
        .filter(Boolean);

      if (rolesToAssign.length > 0) {
        // Remove all existing realm roles
        await keycloakAdmin.users.delRealmRoleMappings({
          realm: tenantRealm,
          id: kcUser.id,
          roles: availableRoles, // delete all existing realm roles
        });

        // Add new roles
        await keycloakAdmin.users.addRealmRoleMappings({
          realm: tenantRealm,
          id: kcUser.id,
          roles: rolesToAssign,
        });

        logger.info(`Updated roles for user '${kcUser.id}' in Keycloak: [${rolesToAssign.map(r => r.name).join(', ')}]`);
      }
    } catch (error) {
      logger.error(`Failed to update user roles in Keycloak: ${error.message}`);
      throw new Error('Failed to update user roles in Keycloak');
    }
  }

  // Step 7: Update user in Postgres DB
  try {
    const fieldsToUpdate = {};
    const hashedPassword = await bcrypt.hash(updateData.password, 10);
    if (updateData.email) fieldsToUpdate.email = updateData.email;
    if (updateData.password) fieldsToUpdate.password = hashedPassword
    if (updateData.roles) fieldsToUpdate.roles = updateData.roles;

    const [updatedUser] = await knex('users')
      .where({ user_id: userId })
      .update(fieldsToUpdate)
      .returning('*');

    if (!updatedUser) {
      throw new Error(`User '${userId}' not found in Postgres for tenant '${tenantRealm}'`);
    }

    logger.info(`Updated user '${userId}' in Postgres for tenant '${tenantRealm}'`);
    return updatedUser;
  } catch (error) {
    logger.error(`Failed to update user '${userId}' in database: ${error.message}`);
    throw new Error('Failed to update user in database');
  }
}

async function deleteUser(tenantRealm, userId) {
  const knex = getTenantKnex(tenantRealm);
  let keycloakAdmin;

  try {
    keycloakAdmin = await getKeycloakAdmin(tenantRealm);
    logger.info(`Keycloak admin authenticated for tenant '${tenantRealm}'`);
  } catch (error) {
    logger.error(`Failed to authenticate Keycloak admin for tenant '${tenantRealm}': ${error.message}`);
    throw new Error('Authentication error with Keycloak admin');
  }

  // Step 1: Delete from Keycloak
  try {
    await keycloakAdmin.users.del({
      realm: tenantRealm,
      id: userId,
    });
    logger.info(`Deleted user '${userId}' from Keycloak realm '${tenantRealm}'`);
  } catch (error) {
    logger.error(`Failed to delete user '${userId}' from Keycloak: ${error.message}`);
    throw new Error('Failed to delete user from Keycloak');
  }

  // Step 2: Delete from PostgreSQL
  try {
    const deletedCount = await knex('users')
      .where({ user_id: userId })
      .del();

    if (deletedCount === 0) {
      const msg = `User with ID '${userId}' not found for deletion in tenant '${tenantRealm}'`;
      logger.warn(msg);
      throw new Error(msg);
    }

    logger.info(`Deleted user '${userId}' from PostgreSQL for tenant '${tenantRealm}'`);
    return true;
  } catch (error) {
    logger.error(`Failed to delete user '${userId}' from PostgreSQL: ${error.message}`);
    throw new Error('Failed to delete user from database');
  }
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
