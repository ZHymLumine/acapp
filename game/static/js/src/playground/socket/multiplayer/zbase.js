class MultiPlayerSocket {
    constructor(playground) {
        this.playground = playground;

        this.ws = new WebSocket("wss://app4877.acapp.acwing.com.cn/wss/multiplayer/");

        this.start();
    }

    start() {
    }

    // 接收服务器发回的json数据
    receive() {
        let outer = this;

        this.ws.onmessage = function(e) {
            let data = JSON.parse(e.data);  // 将字符串转成字典
            let uuid = data.uuid;
            if (uuid == outer.uuid) {       // 忽略服务器发给自己的消息
                return false;
            }

            let event = data.event;
            if (event == "create_player") {     // 根据类型调用相应的函数处理
                outer.receive_create_player(uuid, data.username, data.photo);
            }
        }
    }

    // 向服务器发消息
    send_create_player(username, photo) {
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "create_player",
            'uuid': outer.uuid,
            'username': username,
            'photo': photo,
        }));
    }

    receive_create_player(uuid, username, photo) {
        // 新建一个用户
        let player = new Player(
            this.playground,
            this.playground.width / 2 / this.playground.scale,
            0.5,
            0.05,
            "white",
            0.15,
            "enemy",
            username,
            photo
        );

        player.uuid == uuid;
        this.playground.players.push(player);
    }
}
