// OpenAPI 3.0 Spec (Phase 6) — auto-generated
module.exports = {
    openapi: '3.0.3',
    info: {
        title: 'TrustChecker API',
        version: '1.0.0',
        description:
            'Digital Trust Infrastructure — Anti-counterfeiting, supply chain integrity, and product verification platform.\n\nAuth: Bearer JWT token required.\nVersioning: /api/v1/... (URL) or X-API-Version header.\nResponse: { data, meta, errors }',
        contact: {
            name: 'TrustChecker Team',
        },
    },
    servers: [
        {
            url: '/api/v1',
            description: 'V1 API (current)',
        },
        {
            url: '/api',
            description: 'Legacy API',
        },
    ],
    tags: [
        {
            name: 'Auth',
            description: 'Authentication',
        },
        {
            name: 'Products',
            description: 'Product CRUD',
        },
        {
            name: 'Verification',
            description: 'QR/scan/verify',
        },
        {
            name: 'Trust',
            description: 'Trust scores',
        },
        {
            name: 'Organization',
            description: 'Org management',
        },
        {
            name: 'Risk',
            description: 'Risk/anomaly/fraud',
        },
        {
            name: 'Compliance',
            description: 'Evidence/KYC',
        },
        {
            name: 'Supply Chain',
            description: 'Tracking/EPCIS',
        },
        {
            name: 'Notifications',
            description: 'Alerts/webhooks',
        },
        {
            name: 'Platform',
            description: 'Features/billing',
        },
        {
            name: 'RBAC',
            description: 'Roles/permissions',
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
        schemas: {
            Product: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                    },
                    name: {
                        type: 'string',
                    },
                    sku: {
                        type: 'string',
                    },
                    trust_score: {
                        type: 'number',
                    },
                    org_id: {
                        type: 'string',
                    },
                },
            },
        },
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
    paths: {
        '/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Login',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: {
                                        type: 'string',
                                    },
                                    password: {
                                        type: 'string',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'JWT tokens',
                    },
                    401: {
                        description: 'Invalid',
                    },
                },
            },
        },
        '/auth/register': {
            post: {
                tags: ['Auth'],
                summary: 'Register',
                security: [],
                responses: {
                    201: {
                        description: 'Created',
                    },
                },
            },
        },
        '/auth/refresh': {
            post: {
                tags: ['Auth'],
                summary: 'Refresh token',
                responses: {
                    200: {
                        description: 'New tokens',
                    },
                },
            },
        },
        '/products': {
            get: {
                tags: ['Products'],
                summary: 'List',
                parameters: [
                    {
                        name: 'page',
                        in: 'query',
                        schema: {
                            type: 'integer',
                        },
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        schema: {
                            type: 'integer',
                        },
                    },
                    {
                        name: 'search',
                        in: 'query',
                        schema: {
                            type: 'string',
                        },
                    },
                ],
                responses: {
                    200: {
                        description: 'Product list',
                    },
                },
            },
            post: {
                tags: ['Products'],
                summary: 'Create',
                responses: {
                    201: {
                        description: 'Created',
                    },
                },
            },
        },
        '/products/{id}': {
            get: {
                tags: ['Products'],
                summary: 'Get',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                    },
                ],
                responses: {
                    200: {
                        description: 'Product',
                    },
                },
            },
            put: {
                tags: ['Products'],
                summary: 'Update',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                    },
                ],
                responses: {
                    200: {
                        description: 'Updated',
                    },
                },
            },
            delete: {
                tags: ['Products'],
                summary: 'Delete',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                    },
                ],
                responses: {
                    200: {
                        description: 'Deleted',
                    },
                },
            },
        },
        '/verification/qr/generate': {
            post: {
                tags: ['Verification'],
                summary: 'Generate QR',
                responses: {
                    201: {
                        description: 'QR code',
                    },
                },
            },
        },
        '/verification/scan': {
            post: {
                tags: ['Verification'],
                summary: 'Process scan',
                responses: {
                    200: {
                        description: 'Scan result',
                    },
                },
            },
        },
        '/verification/product/{id}': {
            get: {
                tags: ['Verification'],
                summary: 'Verify product',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                    },
                ],
                responses: {
                    200: {
                        description: 'Verification',
                    },
                },
            },
        },
        '/verification/history': {
            get: {
                tags: ['Verification'],
                summary: 'Scan history',
                responses: {
                    200: {
                        description: 'History',
                    },
                },
            },
        },
        '/trust/dashboard': {
            get: {
                tags: ['Trust'],
                summary: 'Dashboard',
                responses: {
                    200: {
                        description: 'Dashboard',
                    },
                },
            },
        },
        '/trust/score/{productId}': {
            get: {
                tags: ['Trust'],
                summary: 'Calculate score',
                parameters: [
                    {
                        name: 'productId',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                    },
                ],
                responses: {
                    200: {
                        description: 'Score',
                    },
                },
            },
        },
        '/trust/org': {
            get: {
                tags: ['Trust'],
                summary: 'Org score',
                responses: {
                    200: {
                        description: 'Org trust',
                    },
                },
            },
        },
        '/trust/history/{productId}': {
            get: {
                tags: ['Trust'],
                summary: 'Score history',
                parameters: [
                    {
                        name: 'productId',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                    },
                ],
                responses: {
                    200: {
                        description: 'History',
                    },
                },
            },
        },
        '/org': {
            get: {
                tags: ['Organization'],
                summary: 'Get org',
                responses: {
                    200: {
                        description: 'Org info',
                    },
                },
            },
            put: {
                tags: ['Organization'],
                summary: 'Update org',
                responses: {
                    200: {
                        description: 'Updated',
                    },
                },
            },
        },
        '/org/members': {
            get: {
                tags: ['Organization'],
                summary: 'List members',
                responses: {
                    200: {
                        description: 'Members',
                    },
                },
            },
        },
        '/org/invite': {
            post: {
                tags: ['Organization'],
                summary: 'Invite',
                responses: {
                    201: {
                        description: 'Invited',
                    },
                },
            },
        },
        '/org/members/{userId}': {
            delete: {
                tags: ['Organization'],
                summary: 'Remove member',
                parameters: [
                    {
                        name: 'userId',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                    },
                ],
                responses: {
                    200: {
                        description: 'Removed',
                    },
                },
            },
        },
        '/org/stats': {
            get: {
                tags: ['Organization'],
                summary: 'Org stats',
                responses: {
                    200: {
                        description: 'Stats',
                    },
                },
            },
        },
        '/risk/graph': {
            get: {
                tags: ['Risk'],
                summary: 'Risk graph',
                responses: {
                    200: {
                        description: 'Graph',
                    },
                },
            },
        },
        '/risk/anomalies': {
            get: {
                tags: ['Risk'],
                summary: 'Anomalies',
                responses: {
                    200: {
                        description: 'Anomalies',
                    },
                },
            },
        },
        '/risk/fraud-alerts': {
            get: {
                tags: ['Risk'],
                summary: 'Fraud alerts',
                responses: {
                    200: {
                        description: 'Alerts',
                    },
                },
            },
        },
        '/compliance/evidence': {
            get: {
                tags: ['Compliance'],
                summary: 'Evidence packs',
                responses: {
                    200: {
                        description: 'Evidence',
                    },
                },
            },
            post: {
                tags: ['Compliance'],
                summary: 'Create evidence',
                responses: {
                    201: {
                        description: 'Created',
                    },
                },
            },
        },
        '/compliance/kyc': {
            get: {
                tags: ['Compliance'],
                summary: 'KYC status',
                responses: {
                    200: {
                        description: 'KYC',
                    },
                },
            },
        },
        '/compliance/score': {
            get: {
                tags: ['Compliance'],
                summary: 'Compliance score',
                responses: {
                    200: {
                        description: 'Score',
                    },
                },
            },
        },
        '/supply-chain/shipments': {
            get: {
                tags: ['Supply Chain'],
                summary: 'Shipments',
                responses: {
                    200: {
                        description: 'Shipments',
                    },
                },
            },
            post: {
                tags: ['Supply Chain'],
                summary: 'Create shipment',
                responses: {
                    201: {
                        description: 'Created',
                    },
                },
            },
        },
        '/supply-chain/inventory': {
            get: {
                tags: ['Supply Chain'],
                summary: 'Inventory',
                responses: {
                    200: {
                        description: 'Inventory',
                    },
                },
            },
        },
        '/supply-chain/partners': {
            get: {
                tags: ['Supply Chain'],
                summary: 'Partners',
                responses: {
                    200: {
                        description: 'Partners',
                    },
                },
            },
            post: {
                tags: ['Supply Chain'],
                summary: 'Add partner',
                responses: {
                    201: {
                        description: 'Added',
                    },
                },
            },
        },
        '/supply-chain/epcis': {
            post: {
                tags: ['Supply Chain'],
                summary: 'Ingest EPCIS',
                responses: {
                    201: {
                        description: 'Ingested',
                    },
                },
            },
        },
        '/notifications': {
            get: {
                tags: ['Notifications'],
                summary: 'List',
                responses: {
                    200: {
                        description: 'Notifications',
                    },
                },
            },
        },
        '/notifications/{id}/read': {
            put: {
                tags: ['Notifications'],
                summary: 'Mark read',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                    },
                ],
                responses: {
                    200: {
                        description: 'Done',
                    },
                },
            },
        },
        '/notifications/read-all': {
            put: {
                tags: ['Notifications'],
                summary: 'Mark all read',
                responses: {
                    200: {
                        description: 'Done',
                    },
                },
            },
        },
        '/notifications/webhooks': {
            get: {
                tags: ['Notifications'],
                summary: 'Webhooks',
                responses: {
                    200: {
                        description: 'Webhooks',
                    },
                },
            },
            post: {
                tags: ['Notifications'],
                summary: 'Create webhook',
                responses: {
                    201: {
                        description: 'Created',
                    },
                },
            },
        },
        '/platform/features': {
            get: {
                tags: ['Platform'],
                summary: 'Feature flags',
                responses: {
                    200: {
                        description: 'Flags',
                    },
                },
            },
        },
        '/platform/stats': {
            get: {
                tags: ['Platform'],
                summary: 'Platform stats',
                responses: {
                    200: {
                        description: 'Stats',
                    },
                },
            },
        },
        '/platform/billing': {
            get: {
                tags: ['Platform'],
                summary: 'Billing',
                responses: {
                    200: {
                        description: 'Billing',
                    },
                },
            },
        },
        '/rbac/roles': {
            get: {
                tags: ['RBAC'],
                summary: 'List roles',
                responses: {
                    200: {
                        description: 'Roles',
                    },
                },
            },
        },
        '/rbac/roles/{id}/permissions': {
            get: {
                tags: ['RBAC'],
                summary: 'Role perms',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                    },
                ],
                responses: {
                    200: {
                        description: 'Permissions',
                    },
                },
            },
        },
        '/rbac/my-permissions': {
            get: {
                tags: ['RBAC'],
                summary: 'My permissions',
                responses: {
                    200: {
                        description: 'Permissions',
                    },
                },
            },
        },
        '/rbac/assign': {
            post: {
                tags: ['RBAC'],
                summary: 'Assign role',
                responses: {
                    200: {
                        description: 'Assigned',
                    },
                },
            },
        },
        '/rbac/stats': {
            get: {
                tags: ['RBAC'],
                summary: 'RBAC stats',
                responses: {
                    200: {
                        description: 'Stats',
                    },
                },
            },
        },
    },
};
