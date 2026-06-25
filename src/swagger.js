import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Fitness API',
      version: '1.0.0',
      description: 'API documentation for the AI Fitness Platform backend.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:8080/api/v1',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Automatically parse all routes in these files for JSDoc annotations
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
