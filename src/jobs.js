const jobs = new Map();

function createJob(filePath) {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const job = {
        id,
        status: 'pending',
        progress: 0,
        total: 0,
        currentRow: 0,
        filePath,
        resultFileName: null,
        error: null,
        createdAt: Date.now(),
    };
    jobs.set(id, job);
    return job;
}

function getJob(id) {
    return jobs.get(id);
}

function updateJob(id, patch) {
    const job = jobs.get(id);
    if (!job) {
        return null;
    }
    Object.assign(job, patch);
    return job;
}

function removeJob(id) {
    jobs.delete(id);
}

function cleanupOldJobs(maxAgeMs = 2 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [id, job] of jobs) {
        if (now - job.createdAt > maxAgeMs) {
            jobs.delete(id);
        }
    }
}

setInterval(cleanupOldJobs, 30 * 60 * 1000);

module.exports = {
    createJob,
    getJob,
    updateJob,
    removeJob,
};
