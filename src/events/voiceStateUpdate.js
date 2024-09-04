const client = require("../index");

client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.member.id === client.user.id) {
        if (newState.channelId) {
            startDisconnectTimer(newState.channel);
        } else {
            clearTimeout(disconnectTimer);
        }
    }
});

let disconnectTimer;

function startDisconnectTimer(channel) {
    clearTimeout(disconnectTimer);
    disconnectTimer = setTimeout(() => {
        if (channel.members.size === 1) { 
            channel.leave();
        }
    }, 300000); // 300000 ms = 5 Minutes
}