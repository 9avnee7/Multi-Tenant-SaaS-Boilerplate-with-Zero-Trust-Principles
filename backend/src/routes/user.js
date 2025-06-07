const express = require('express');
const router = express.Router();
const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../services/userService');
const { rbac,keycloakMiddleware } = require('../keycloak/middleware');

// List all users in tenant (protected, e.g., admin or manager role)
router.get('/', rbac('admin'), async (req, res) => {
  console.log('GET /api/users called with tenant:', req.tenantRealm);
  try {
    const users = await getUsers(req.tenantRealm);
    console.log('Users fetched:', users);
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});


// Get single user by ID
router.get('/:id', rbac('admin'), async (req, res) => {
  try {
    const user = await getUserById(req.tenantRealm, req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {

    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user (admin only)
router.post('/', rbac('admin'), async (req, res) => {
  console.log("POST /api/users called with tenant:", req.tenantRealm);
  try {
    const userData = req.body;
    const newUser = await createUser(req.tenantRealm, userData);
    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user by ID
router.put('/:id', rbac('admin'), async (req, res) => {
  try {
    const updatedUser = await updateUser(req.tenantRealm, req.params.id, req.body);
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user by ID
router.delete('/:id', rbac('admin'), async (req, res) => {
  console.log("delete /api/users/:id called with tenant:", req.tenantRealm);
  try {
    const deleted = await deleteUser(req.tenantRealm, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/me', keycloakMiddleware, async (req, res) => {
  console.log('GET /api/users/me called with tenant:', req.tenantRealm);

  try {
    const userId = req.user.sub;
    const user = await getUserById(req.tenantRealm, userId);

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error in /me route:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
