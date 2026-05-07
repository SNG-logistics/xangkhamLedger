const socketIo = require('socket.io');

let io;

module.exports = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });

        // Define rooms or additional event listeners here if needed
        // socket.on('join_room', (room) => { socket.join(room); });
    });

    return io;
};
