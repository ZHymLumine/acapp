class ChatField {
    constructor(playground) {
        this.playground = playground;
        this.$history = $(`<div class="ac-game-chat-field-history">历史记录</div>`);
        this.$input = $(`<input type="text" class="ac-game-chat-field-input">`);

        this.$history.hide();
        this.$input.hide();

        this.func_id = null;

        this.playground.$playground.append(this.$history);
        this.playground.$playground.append(this.$input);

        this.start();
    }

    start() {
        this.add_listening_events();
    }

    add_listening_events() {
        let outer = this;

        this.$input.keydown(function(e) {
            if (e.which === 27) {   // ESC
                outer.$input.hide();
                return false;
            } else if (e.which === 13) {    // Enter 发送消息
                let username = outer.playground.root.settings.username;
                let text = outer.$input.val();
                if (text) {
                    outer.$input.val("");   // 发送后输入框设为空
                    outer.add_message(username, text);
                    // 广播消息
                   outer.playground.multi_player_socket.send_message(username, text);
                }
                return false;
            }
        });
    }

    render_message(message) {
        return $(`<div>${message}</div>`);
    }

    add_message(username, text) {
        this.show_history();
        let message = `[${username}]${text}`;
        this.$history.append(this.render_message(message));
        this.$history.scrollTop(this.$history[0].scrollHeight); // 显示最新的几条消息
    }

    show_history() {
        let outer = this;
        this.$history.fadeIn();     // 渐变地显示

        if (this.func_id) clearTimeout(this.func_id);   // 上一次绑定的消失函数还没到3秒时，清除上次的函数，重新绑定一次

        this.func_id = setTimeout(function(){
            outer.$history.fadeOut();   // 3秒后渐变的消失
            outer.func_id = null;
        }, 3000);
    }

    show_input() {
        this.show_history();

        this.$input.show();
        this.$input.focus();    // 输入时，聚焦于输入框
    }

    hide_input() {
        this.$input.hide();
        this.playground.game_map.$canvas.focus();  // 退出时，聚焦回游戏界面
    }
}
