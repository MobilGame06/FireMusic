const client = require("../index");

let player;
client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.member.id === client.user.id) {
        if (newState.channelId) {
            startDisconnectTimer(newState.channel);
        } else {
            clearTimeout(disconnectTimer);
        }
        player = client.lavalink.getPlayer(newState.guild.id);
    }
});

let disconnectTimer;

function startDisconnectTimer(channel) {
    clearTimeout(disconnectTimer);
    disconnectTimer = setTimeout(() => {
        if (channel.members.size === 1) {
            player.disconnect()
            player.destroy();
        }
    }, 300000); // 300000 ms = 5 Minutes
}