require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const tenantCreationRoutes = require('./routes/tenantCreation');


const { initKeycloak } = require('./keycloak/keycloak-config');
const { tenantExtractor, rbac } = require('./keycloak/middleware');
const tenantRoutes = require('./routes/tenant');
const userRoutes = require('./routes/user');

const opaMiddleware = require('./opa/opaMiddleware'); // Import OPA middleware

const app = express();

app.use(cors(
    //we will allow all headers for now
    {
        origin: '*', // Adjust this to your frontend URL in production
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        allowedHeaders: 'Content-Type, Authorization, X-Tenant-Realm',
    }
));
app.use(helmet());
app.use(express.json());


app.use('/api',tenantCreationRoutes);


// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));


app.use(morgan('combined'));

// Sessions required by Keycloak
app.use(session({
  secret: 'aVerySecretKey',
  resave: false,
  saveUninitialized: true,
  store: require('./keycloak/keycloak-config').memoryStore,
}));

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

function errorHandler(err, req, res, next) {

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
}


app.use(errorHandler);

initKeycloak();

app.use(tenantExtractor); // Extract tenant and setup Keycloak instance for it
app.use(opaMiddleware);

// Routes
app.use('/api/tenants', rbac('admin'), tenantRoutes);
app.use('/api/users', userRoutes);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend API listening on port ${PORT}`));
