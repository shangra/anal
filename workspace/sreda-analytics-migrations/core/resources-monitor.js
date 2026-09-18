const v8 = require('v8');

const lag = require('event-loop-lag');

const period = +sreda.env.MONITOR_LOG_PERIOD || 30_000;

const lagMonitor = lag(+sreda.env.MONITOR_EVENT_LOOP_LAG_PREIOD || period);

function getMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    return {
        rss: memoryUsage.rss, // Resident Set Size: total memory allocated for the process
        heapTotal: memoryUsage.heapTotal, // Total size of the allocated heap
        heapUsed: memoryUsage.heapUsed, // Actual memory used during the heap
        external: memoryUsage.external, // Memory used by C++ objects bound to JavaScript objects
        heapSizeLimit: heapStats.heap_size_limit,
        heapStats,
    };
}

const print = (val) => JSON.stringify(val || '', null, 2);

const getGCMetrics = () => {
    const gcStats = v8.getHeapStatistics();

    return {
        totalHeapSize: gcStats.total_heap_size,
        usedHeapSize: gcStats.used_heap_size,
        heapSizeLimit: gcStats.heap_size_limit,
    };
};

const getActiveHandlesAndRequests = () => {
    return {
        activeHandles: process?._getActiveHandles()?.length,
        activeRequests: process?._getActiveRequests()?.length,
    };
};

function logMemoryUsage() {
    console.log({
        message: 'MONITOR DATA',
        eventLoopLag: lagMonitor(),
        memoryUsage: getMemoryUsage(),
        gcMetric: getGCMetrics(),
        activeHandles: getActiveHandlesAndRequests(),
    });
}

if (sreda.env.RESOURCES_MONITOR === true) {
    setInterval(logMemoryUsage, +period);
}

module.exports = {};
