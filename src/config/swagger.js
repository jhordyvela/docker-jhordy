import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Ecommerce API',
            version: '1.0.0',
            description: 'API para la tienda ecommerce con autenticación, productos y promociones',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Servidor Local',
            },
            {
                url: 'https://eccomerce-tienda.onrender.com',
                description: 'Servidor Render',
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
    },
    apis: ['./src/routes/*.js'], // Indica dónde están las definiciones de rutas
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;