const jobs = new Map();

function createJob(yearStart, yearEnd) {
    const jobId = `collect_${Date.now()}`;
    jobs.set(jobId, {
        status: 'running',
        yearStart,
        yearEnd,
        currentYear: yearStart,
        currentPage: 1,
        totalCreated: 0,
        totalSkipped: 0,
        totalFailed: 0,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        error: null,
    });
    return jobId;
}

function getJob(jobId) {
    return jobs.get(jobId) || null;
}

function updateJob(jobId, patch) {
    const job = jobs.get(jobId);
    if (job) jobs.set(jobId, { ...job, ...patch });
}

module.exports = { createJob, getJob, updateJob };
