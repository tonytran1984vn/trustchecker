const logger = require('../../../server/lib/logger');

describe('logger', () => {
    let stdoutSpy, stderrSpy;

    beforeEach(() => {
        stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
        stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
    });

    test('exports error function', () => {
        expect(typeof logger.error).toBe('function');
    });

    test('exports warn function', () => {
        expect(typeof logger.warn).toBe('function');
    });

    test('exports info function', () => {
        expect(typeof logger.info).toBe('function');
    });

    test('exports debug function', () => {
        expect(typeof logger.debug).toBe('function');
    });

    test('exports log function', () => {
        expect(typeof logger.log).toBe('function');
    });

    test('error writes to stderr', () => {
        logger.error('test error');
        expect(stderrSpy).toHaveBeenCalled();
    });

    test('info writes to stdout', () => {
        logger.info('test info');
        expect(stdoutSpy).toHaveBeenCalled();
    });

    test('warn writes to stdout', () => {
        logger.warn('test warn');
        expect(stdoutSpy).toHaveBeenCalled();
    });

    test('log output is valid JSON', () => {
        logger.info('json test');
        const output = stdoutSpy.mock.calls[0][0];
        expect(() => JSON.parse(output)).not.toThrow();
    });

    test('log includes @timestamp', () => {
        logger.info('ts test');
        const entry = JSON.parse(stdoutSpy.mock.calls[0][0]);
        expect(entry['@timestamp']).toBeDefined();
    });

    test('log includes level', () => {
        logger.info('lvl test');
        const entry = JSON.parse(stdoutSpy.mock.calls[0][0]);
        expect(entry.level).toBe('info');
    });

    test('log includes message', () => {
        logger.info('hello world');
        const entry = JSON.parse(stdoutSpy.mock.calls[0][0]);
        expect(entry.message).toBe('hello world');
    });

    test('log includes service name', () => {
        logger.info('svc test');
        const entry = JSON.parse(stdoutSpy.mock.calls[0][0]);
        expect(entry.service).toBe('trustchecker');
    });

    test('log includes pid', () => {
        logger.info('pid test');
        const entry = JSON.parse(stdoutSpy.mock.calls[0][0]);
        expect(entry.pid).toBe(process.pid);
    });

    test('log includes custom meta', () => {
        logger.info('meta test', { userId: '123' });
        const entry = JSON.parse(stdoutSpy.mock.calls[0][0]);
        expect(entry.userId).toBe('123');
    });

    test('error level outputs JSON', () => {
        logger.error('err json');
        const output = stderrSpy.mock.calls[0][0];
        const entry = JSON.parse(output);
        expect(entry.level).toBe('error');
    });
});
