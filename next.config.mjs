/** Pages you opened in the last 30 seconds come back instantly. Your own saves refresh them. */
const config = { experimental: { staleTimes: { dynamic: 30 } } };
export default config;
