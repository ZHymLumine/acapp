class AcGamePlayground {
    constructor(root) {
        this.root = root;
        this.$playground = $(`<div class="ac-game-playground"></div>`);

        this.hide();    //隐藏界面

        this.root.$ac_game.append(this.$playground);
        this.start();
    }

    // 产生随机颜色
    get_random_color() {
        let colors = ["blue", "red", "pink", "grey", "green"];
        return colors[Math.floor(Math.random() * 5)];
    }


    create_uuid() {
        let res = "";
        for (let i = 0; i < 8; i ++ ) {
            let x = parseInt(Math.floor(Math.random() * 10));   //[0, 10)
            res += x;
        }
        return res;
    }


    start() {
        let outer = this;
        let uuid = this.create_uuid();
        $(window).on(`resize.${uuid}`, function(){
            outer.resize();
        });

        //acapp 端为多个窗口分别绑定事件函数
        if (this.root.AcWingOS) {
            outer.root.AcWingOS.api.window.on_close(function() {
                $(window).off(`resize.${uuid}`);
            });
        }
    }

    resize() {
        this.width = this.$playground.width();
        this.height = this.$playground.height();
        let unit = Math.min(this.width / 16, this.height / 9);  // 以最小的作为基准，渲染
        this.width = unit * 16;
        this.height = unit * 9;


        this.scale = this.height;   // resize时，其他元素的渲染大小都以当前渲染的高度为基准，存为 scale 变量

        if (this.game_map) this.game_map.resize();  //如果此时地图已创建，则resize一下
    }


    show(mode) {    // 打开playground界面
        let outer = this;

        this.$playground.show();



        this.width = this.$playground.width();
        this.height = this.$playground.height();
        this.game_map = new GameMap(this);  //生成地图

        this.mode = mode;   // 记录游戏模式
        this.state = "waiting";     //游戏状态 waiting -> fighting -> over
        this.notice_board = new NoticeBoard(this);
        this.score_board = new ScoreBoard(this);
        this.player_count = 0;  // 统计玩家数量


        this.resize();
        this.players = [];
        // 用字符串表示不同player
        this.players.push(new Player(this, this.width / 2 / this.scale, 0.5, 0.05 , "white", 0.15 , "me", this.root.settings.username, this.root.settings.photo));

        //创建敌人
        if (mode === "single mode") {
            for (let i = 0; i < 5; i ++) {
                this.players.push(new Player(this, this.width / 2 / this.scale, 0.5, 0.05, this.get_random_color(), 0.15, "robot"));
            }
        } else if (mode === "multi mode") {
            this.chat_field = new ChatField(this);  // 创建聊天框
            this.multi_player_socket = new MultiPlayerSocket(this);
            this.multi_player_socket.uuid = this.players[0].uuid;   // 自己的uuid(始终是第一个player)

            this.multi_player_socket.ws.onopen = function() {     // 连接建立后，向server发送消息
                outer.multi_player_socket.send_create_player(outer.root.settings.username, outer.root.settings.photo);
            }
        }
    }

    hide() {        // 关闭playground界面
        // 清空所有游戏元素
        while(this.players && this.players.length > 0) {
            this.players[0].destroy();
        }

        if (this.game_map) {
            this.game_map.destroy();
            this.game_map = null;
        }

        if (this.notice_board) {
            this.notice_board.destroy();
            this.notice_board = null;
        }

        if (this.score_board) {
            this.score_board.destroy();
            this.score_board = null;
        }
        this.$playground.empty();   // 清空所有html标签

        this.$playground.hide();
    }
}
