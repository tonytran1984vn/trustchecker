const { gdprMiddleware, dataExportHandler, dataDeleteHandler } = require('../../../server/middleware/gdpr');

function mockRes() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
    };
}

describe('gdprMiddleware', () => {
    test('sets X-Data-Region header', () => {
        const res = mockRes();
        gdprMiddleware({}, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Data-Region', expect.any(String));
    });

    test('sets X-Data-Retention header', () => {
        const res = mockRes();
        gdprMiddleware({}, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Data-Retention', '365d');
    });

    test('calls next()', () => {
        const next = jest.fn();
        gdprMiddleware({}, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });
});

describe('dataExportHandler', () => {
    test('returns 401 when no user', () => {
        const res = mockRes();
        dataExportHandler({ user: null }, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('queues export for authenticated user', () => {
        const res = mockRes();
        dataExportHandler({ user: { id: 'user-1' } }, res);
        const body = res.json.mock.calls[0][0];
        expect(body.export_request.status).toBe('queued');
        expect(body.export_request.user_id).toBe('user-1');
    });

    test('returns json format', () => {
        const res = mockRes();
        dataExportHandler({ user: { id: 'u1' } }, res);
        expect(res.json.mock.calls[0][0].export_request.format).toBe('json');
    });
});

describe('dataDeleteHandler', () => {
    test('returns 401 when no user', () => {
        const res = mockRes();
        dataDeleteHandler({ user: null }, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('queues deletion for authenticated user', () => {
        const res = mockRes();
        dataDeleteHandler({ user: { id: 'user-2' } }, res);
        const body = res.json.mock.calls[0][0];
        expect(body.deletion_request.status).toBe('queued');
        expect(body.deletion_request.user_id).toBe('user-2');
    });

    test('estimates 30 days completion', () => {
        const res = mockRes();
        dataDeleteHandler({ user: { id: 'u1' } }, res);
        expect(res.json.mock.calls[0][0].deletion_request.estimated_completion).toBe('30 days');
    });
});
