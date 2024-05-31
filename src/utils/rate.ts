let lastRequestTime = 0;
const minInterval = 10000; // Minimum interval between requests in milliseconds

export const rateLimiter = async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
};
