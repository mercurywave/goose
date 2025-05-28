export default {
  server: {
    proxy: {
      "/api": "http://localhost:1987",
    },
  },
};