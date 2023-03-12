class AcGameMenu {
    constructor(root) {
        this.root = root;
        this.$menu = $(`
<div class="ac-game-menu">
    <div class="ac-game-menu-field">
        <div class="ac-game-menu-field-item ac-game-menu-field-item-single-mode">
            单人模式
        </div>
        <br>
        <div class="ac-game-menu-field-item ac-game-menu-field-item-multi-mode">
            多人模式
        </div>
        <br>
        <div class="ac-game-menu-field-item ac-game-menu-field-item-settings">
            退出
        </div>
    </div>
</div>
`);

        this.$menu.hide();
        this.root.$ac_game.append(this.$menu); //将当前menu加到主页面中
        this.$single_mode = this.$menu.find('.ac-game-menu-field-item-single-mode'); //single 按钮
        this.$multi_mode = this.$menu.find('.ac-game-menu-field-item-multi-mode');   //multi 按钮
        this.$settings = this.$menu.find('.ac-game-menu-field-item-settings');       //settings 按钮


        this.start();
    }

    start() {
        this.add_listening_events();
    }

    //绑定监听函数
    add_listening_events() {
        let outer = this;

        this.$single_mode.click(function(){
            outer.hide(); //关闭menu界面
            outer.root.playground.show("single mode"); //显示单人游戏界面
        });

        this.$multi_mode.click(function(){
            outer.hide();
            outer.root.playground.show("multi mode");   // 显示多人游戏界面
        });

        this.$settings.click(function(){
            outer.root.settings.logout_on_remote();
        });
    }

    show() {    //显示menu界面
        this.$menu.show();
    }

    hide() {    //关闭menu界面
        this.$menu.hide();
    }

}
let AC_GAME_OBJECTS = [];  //全局objects对象数组

class AcGameObject {
    constructor() {
        AC_GAME_OBJECTS.push(this);

        this.has_called_start = false;  //是否执行过start函数
        this.timedelta = 0;     // 当前帧距离上一帧的时间 单位：ms
        this.uuid = this.create_uuid();
    }


    create_uuid() {
        let res = "";
        for (let i = 0; i < 8; i ++) {
            let x = parseInt(Math.floor(Math.random() * 10));   // 返回[0, 10)之间的数
            res += x;
        }
        return res;
    }

    start() {   //只会在第一帧执行一次
    }

    update() {  //每一帧都执行一次
    }

    late_update() { // 每一帧的最后执行一次
    }

    on_destroy() {  //被销毁前执行一次
    }

    destroy() { // 删掉该物体
        this.on_destroy();

        for (let i = 0; i < AC_GAME_OBJECTS.length; i ++) {
            if (AC_GAME_OBJECTS[i] === this) {
                AC_GAME_OBJECTS.splice(i, 1);   //从i开始删一个
                break;
            }
        }
    }
}

let last_timestamp;
let AC_GAME_ANIMATION = function(timestamp) {
    for (let i = 0; i < AC_GAME_OBJECTS.length; i ++) {
        let obj = AC_GAME_OBJECTS[i];
        if (!obj.has_called_start) {
            obj.start();
            obj.has_called_start = true;
        } else {
            obj.timedelta = timestamp - last_timestamp;
            obj.update();
        }
    }

    for (let i = 0; i < AC_GAME_OBJECTS.length; i ++) {
        let obj = AC_GAME_OBJECTS[i];
        obj.late_update();
    }

    last_timestamp = timestamp;

    requestAnimationFrame(AC_GAME_ANIMATION);  //递归地画下一帧
}

requestAnimationFrame(AC_GAME_ANIMATION);

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
class GameMap extends AcGameObject {
    constructor(playground) {
        super();
        this.playground = playground;
        this.$canvas = $(`<canvas tabindex=0></canvas>`);  //画布   tabindex=0:令canvas能监听
        this.ctx = this.$canvas[0].getContext('2d');
        this.ctx.canvas.width = this.playground.width;
        this.ctx.canvas.height = this.playground.height;
        this.playground.$playground.append(this.$canvas);
    }

    start() {
        this.$canvas.focus();   // 聚焦到当前窗口
    }

    resize() {
        this.ctx.canvas.width = this.playground.width;
        this.ctx.canvas.height = this.playground.height;
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    update(){
        this.render();
    }

    render() {  //渲染canvas
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
}


class NoticeBoard extends AcGameObject {
    constructor(playground) {
        super();

        this.playground = playground;
        this.ctx = this.playground.game_map.ctx;
        this.text = "已就绪: 0人";
    }

    start() {
    }

    write(text) {
        this.text = text;
    }

    update() {
        this.render();
    }

    render() {
        this.ctx.font = "20px serif";
        this.ctx.fillStyle = "white";
        this.ctx.textAlign = "center";
        this.ctx.fillText(this.text, this.playground.width / 2, 20);
    }
}
class Particle extends AcGameObject {
    constructor(playground, x, y, radius, vx, vy, color, speed, move_length){
        super();
        this.playground = playground;
        this.ctx = this.playground.game_map.ctx;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.speed = speed;
        this.move_length = move_length;
        this.friction = 0.9;
        this.eps = 0.01;
    }


    start() {
    }

    update() {
        // 粒子移动距离为0或速度为0时粒子消失
        if (this.move_length < this.eps || this.speed < this.eps) {
            this.destroy();
            return false;
        }

        let moved = Math.min(this.move_length, this.speed * this.timedelta / 1000);
        this.x += this.vx * moved;
        this.y += this.vy * moved;
        this.speed *= this.friction;    // 速度衰减
        this.move_length -= moved;
        this.render();
    }

    render() {
        let scale = this.playground.scale
        this.ctx.beginPath();
        this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
    }

}
class Player extends AcGameObject {
    constructor(playground, x, y, radius, color, speed, character, username, photo) {
        super();
        this.playground = playground;
        this.ctx = this.playground.game_map.ctx;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = radius;
        this.move_length = 0;
        this.color = color;
        this.speed = speed;
        this.character = character;
        this.username = username;
        this.photo = photo;
        this.eps = 0.01;
        this.friction = 0.9     // 摩擦系数，作用于受击速度
        this.spent_time = 0;    // 游戏时长
        this.cur_skill = null; //当前技能（非快捷施法）
        this.fireballs = [];    // 存该用户发射的所有火球，便于删除火球

        if (this.character !== "robot") {   // 不是机器人时渲染自己或敌人的头像
            this.img = new Image();
            this.img.src = this.photo;
        }

        if (this.character === "me") {
            this.fireball_coldtime = 3; // 3秒冷却
            this.fireball_img = new Image();
            this.fireball_img.src = "https://cdn.acwing.com/media/article/image/2021/12/02/1_9340c86053-fireball.png";

            this.blink_coldtime = 5;
            this.blink_img = new Image();
            this.blink_img.src = "https://cdn.acwing.com/media/article/image/2021/12/02/1_daccabdc53-blink.png";
        }
    }

    start() {
        this.playground.player_count ++;
        this.playground.notice_board.write("已就绪: " + this.playground.player_count + "人");

        // 场上大于3人开始游戏
        if (this.playground.player_count >= 3) {
            this.playground.state = "fighting";
            this.playground.notice_board.write("Fighting");
        }

        if (this.character === "me") {    //如果是自己，用鼠标键盘操作
            this.add_listening_events();
        } else if (this.character === "robot"){    //AI敌人
            let tx = Math.random() * this.playground.width / this.playground.scale;     //随机一个地点，让敌人走过去
            let ty = Math.random() * this.playground.height / this.playground.scale;
            this.move_to(tx, ty);
        }
    }


    // 监听事件
    add_listening_events() {
        let outer = this;
        this.playground.game_map.$canvas.on("contextmenu", function() {     //取消右键菜单
            return false;
        });
        this.playground.game_map.$canvas.mousedown(function(e) {
            if (outer.playground.state !== "fighting")
                return true;

            const rect = outer.ctx.canvas.getBoundingClientRect();  //获取画布的矩形
            if (e.which === 3) {  //鼠标右键
                let tx = (e.clientX - rect.left) / outer.playground.scale;
                let ty = (e.clientY - rect.top) / outer.playground.scale;
                outer.move_to(tx, ty); //鼠标点击坐标相对于整个屏幕，映射到画布中的坐标

                if (outer.playground.mode === "multi mode") {
                    outer.playground.multi_player_socket.send_move_to(tx, ty);  // 多人模式，与服务器通信
                }

            } else if (e.which === 1) { //左键
                let tx = (e.clientX - rect.left) / outer.playground.scale;
                let ty = (e.clientY - rect.top) / outer.playground.scale;
                if (outer.cur_skill === "fireball") {
                    if (outer.fireball_coldtime > outer.eps)
                        return false;

                    let fireball = outer.shoot_fireball(tx, ty);

                    if (outer.playground.mode === "multi mode") {
                        outer.playground.multi_player_socket.send_shoot_fireball(tx, ty, fireball.uuid);    // 同步火球
                    }
                } else if (outer.cur_skill === "blink") {   //闪现
                    if (outer.blink_coldtime > outer.eps) {
                        return false;
                    }

                    outer.blink(tx, ty);

                    if (outer.playground.mode === "multi mode") {
                        outer.playground.multi_player_socket.send_blink(tx, ty);    // 广播，同步闪现操作
                    }
                }
                outer.cur_skill = null;
            }
        });
        //获取键盘事件
        this.playground.game_map.$canvas.keydown(function(e) {
            if (e.which === 13) {   // Enter键
                if (outer.playground.mode === "multi mode") {   // 打开聊天框
                    outer.playground.chat_field.show_input();
                    return false;
                }
            } else if (e.which === 27) {    // Esc
                if (outer.playground.mode === "multi mode") {   // 关闭聊天框
                    outer.playground.chat_field.hide_input();
                    return false;
                }
            }

            if (outer.playground.state !== "fighting")
                return true;

            if (e.which === 81) {    // q键
                if (outer.fireball_coldtime > outer.eps) {   // 还未冷却
                    return true;
                }
                outer.cur_skill = "fireball";
                return false;
            } else if (e.which === 70) {    // f
                if (outer.blink_coldtime > outer.eps) {
                    return true;
                }
                outer.cur_skill = "blink";
                return true;
            }
        });
    }


    detach_listening_events() {
        this.playground.game_map.$canvas.mousedown(function() {
            return false;
        });
    }

    //发射火球
    shoot_fireball(tx, ty) {
        let x = this.x, y = this.y;
        let scale = this.playground.scale
        let radius = 0.01;
        let angle = Math.atan2(ty - this.y, tx - this.x);
        let vx = Math.cos(angle), vy = Math.sin(angle);
        let color = "orange";
        let speed = 0.5;
        let move_length = 1;
        let damage = 0.01;
        let fireball = new FireBall(this.playground, this, x, y, radius, vx, vy, color, speed, move_length, damage);
        this.fireballs.push(fireball);  // 存到火球数组

        this.fireball_coldtime = 3;
        return fireball;
    }

    // 删除火球
    destroy_fireball(uuid) {
        for (let i = 0; i < this.fireballs.length; i ++) {
            let fireball = this.fireballs[i];
            if (fireball.uuid === uuid) {
                fireball.destroy();
                break;
            }
        }
    }

    // 闪现
    blink(tx, ty) {
        let d = this.get_dist(this.x, this.y, tx, ty);
        d = Math.min(d, 0.8);   // 最多闪现0.8倍高度
        let angle = Math.atan2(ty - this.y, tx - this.x);
        this.x += d * Math.cos(angle);
        this.y += d * Math.sin(angle);

        this.blink_coldtime = 5;    //重置冷却
        this.move_length = 0;   // 闪现后停下来
    }

    //计算两点之间的距离
    get_dist(x1, y1, x2, y2) {
        let dx = x1 - x2;
        let dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    //计算移动距离和方向
    move_to(tx, ty) {
        this.move_length = this.get_dist(this.x, this.y, tx, ty);   //现在位置与目标位置的距离
        let angle = Math.atan2(ty - this.y, tx - this.x);
        this.vx = Math.cos(angle);  //水平方向
        this.vy = Math.sin(angle);  //竖直方向
    }


    // 受到攻击
    is_attacked(angle, damage) {
        // 产生受到攻击时的粒子效果
        for (let i = 0; i < 20 + Math.random() * 10; i ++) {
            let x = this.x, y = this.y;
            let radius = this.radius * Math.random() * 0.1;
            let angle = Math.PI * 2 * Math.random(); //随机粒子方向
            let vx = Math.cos(angle), vy = Math.sin(angle);
            let color = this.color;
            let speed = this.speed * 10;
            let move_length = this.radius * Math.random() * 5;
            new Particle(this.playground, x, y, radius, vx, vy, color, speed, move_length);
        }

        this.radius -= damage;      //球的大小作为血量
        if (this.radius < this.eps) {
            this.dead = true;
            this.destroy();
            return false;
        }
        //受击后的移动方向和速度
        this.damage_x = Math.cos(angle);
        this.damage_y = Math.sin(angle);
        this.damage_speed = damage * 100;
        this.speed *= 0.8;  // 每次被攻击移动速度减慢
    }


    receive_attack(x, y, angle, damage, ball_uuid, attacker) {
        attacker.destroy_fireball(ball_uuid);   // 删掉攻击者的火球
        // 同步自己的坐标
        this.x = x;
        this.y = y;
        this.is_attacked(angle, damage);
    }

    update() {
        this.spent_time += this.timedelta / 1000;   //游戏经过时间

        this.update_win();

        if (this.character === "me" && this.playground.state === "fighting") {
            this.update_coldtime();
        }
        this.update_move();

        this.render();
    }


    // 判断胜利
    update_win() {
        // fighting状态，只有一名玩家并且是自己
        if (this.playground.state === "fighting" && this.character === "me" && this.playground.players.length ===  1) {
            this.playground.state = "over";
            this.playground.score_board.win();
        }
    }

    //  更新技能的冷却时间
    update_coldtime() {
        this.fireball_coldtime -= this.timedelta / 1000;
        this.fireball_coldtime = Math.max(this.fireball_coldtime, 0);

        this.blink_coldtime -= this.timedelta / 1000;
        this.blink_coldtime = Math.max(this.blink_coldtime, 0);
    }

    update_move() {

        // 游戏时间大于4秒，每300帧AI发射一个火球
        if(this.character === "robot" && this.spent_time > 4 && Math.random() < 1 / 300.0) {
            let player = this.playground.players[Math.floor(Math.random() * this.playground.players.length)]; //随机一个目标
            if (this !== player) {
                //射向0.3秒后的位置
                let tx = player.x + player.speed * player.vx * this.timedelta / 1000 * 0.3;
                let ty = player.y + player.speed * player.vy * this.timedelta / 1000 * 0.3;
                this.shoot_fireball(tx, ty);
            }
        }

        if (this.damage_speed > this.eps) {   // 受到攻击, 后退
            this.vx = this.vy = 0;
            this.move_length = 0;
            this.x += this.damage_x * this.damage_speed * this.timedelta / 1000;
            this.y += this.damage_y * this.damage_speed * this.timedelta / 1000;
            this.damage_speed *= this.friction;     // 速度递减(受击后先后退快，逐渐变慢)
        } else {
            if (this.move_length < this.eps) {
                this.move_length = 0;
                this.vx = this.vy = 0;
                if (this.character === "robot") {  //AI走到目的地时，再随机一个目标位置
                    let tx = Math.random() * this.playground.width / this.playground.scale;     //随机一个地点，让敌人走过去
                    let ty = Math.random() * this.playground.height / this.playground.scale;
                    this.move_to(tx, ty);
                }
            } else {
                let moved = Math.min(this.move_length, this.speed * this.timedelta / 1000);  //求移动距离
                this.x += this.vx * moved;
                this.y += this.vy * moved;
                this.move_length -= moved;
            }

        }
    }

    render() {
        let scale = this.playground.scale;
        if (this.character !== "robot") {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
            this.ctx.stroke();
            this.ctx.clip();
            this.ctx.drawImage(this.img, (this.x - this.radius) * scale, (this.y - this.radius) * scale, this.radius * 2 * scale, this.radius * 2 * scale);
            this.ctx.restore();
        } else {
            this.ctx.beginPath();
            this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
            this.ctx.fillStyle = this.color;
            this.ctx.fill();
        }

        if (this.character === "me" && this.playground.state === "fighting") {
            this.render_skill_coldtime();
        }
    }

    render_skill_coldtime() {
        let scale = this.playground.scale;
        let x = 1.5, y = 0.9, r = 0.04;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x * scale, y * scale, r * scale, 0, Math.PI * 2, false);
        this.ctx.stroke();
        this.ctx.clip();
        this.ctx.drawImage(this.fireball_img, (x - r) * scale, (y - r) * scale, r * 2 * scale, r * 2 * scale);
        this.ctx.restore();

        if (this.fireball_coldtime > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * scale, y * scale);  // 从圆心开始画
            this.ctx.arc(x * scale, y * scale, r * scale, 0 - Math.PI / 2, Math.PI * 2 * (1 - this.fireball_coldtime / 3) - Math.PI / 2, true);
            this.ctx.lineTo(x * scale, y * scale);
            this.ctx.fillStyle = "rgba(0, 0, 255, 0.6)";
            this.ctx.fill();
        }

        x = 1.62, y = 0.9, r = 0.04;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x * scale, y * scale, r * scale, 0, Math.PI * 2, false);
        this.ctx.stroke();
        this.ctx.clip();
        this.ctx.drawImage(this.blink_img, (x - r) * scale, (y - r) * scale, r * 2 * scale, r * 2 * scale);
        this.ctx.restore();

        if (this.blink_coldtime > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * scale, y * scale);  // 从圆心开始画
            this.ctx.arc(x * scale, y * scale, r * scale, 0 - Math.PI / 2, Math.PI * 2 * (1 - this.blink_coldtime / 5) - Math.PI / 2, true);
            this.ctx.lineTo(x * scale, y * scale);
            this.ctx.fillStyle = "rgba(0, 0, 255, 0.6)";
            this.ctx.fill();
        }
    }

    on_destroy() {
        // 自己死亡，并且处于fighting状态，失败
        if (this.character === "me" && this.playground.state === "fighting") {
            this.playground.state = "over";
            this.playground.score_board.lose();
        }

        for (let i = 0; i < this.playground.players.length; i++) {
            let player = this.playground.players[i];
            if (this === player) {
                this.playground.players.splice(i, 1);
                break;
            }
        }
    }
}
class ScoreBoard extends AcGameObject {
    constructor(playground) {
        super();

        this.playground = playground;
        this.ctx = this.playground.game_map.ctx;

        this.state = null;      // win: 胜利， lose: 失败

        this.win_img = new Image();
        this.win_img.src = "https://cdn.acwing.com/media/article/image/2021/12/17/1_8f58341a5e-win.png";

        this.lose_img = new Image();
        this.lose_img.src = "https://cdn.acwing.com/media/article/image/2021/12/17/1_9254b5f95e-lose.png";
    }

    start() {
    }

    add_listening_events() {
        let outer = this;
        let $canvas = this.playground.game_map.$canvas;

        // 点击鼠标返回到菜单界面
        $canvas.on("click", function() {
            outer.playground.hide();
            outer.playground.root.menu.show();
        });
    }

    win() {
        this.state = "win";

        // 结束界面显示一秒后，添加监听函数
        let outer = this;
        setTimeout(function() {
            outer.add_listening_events();
        }, 1000);
    }

    lose() {
        this.state = "lose";

        let outer = this;
        setTimeout(function(){
            outer.add_listening_events();
        }, 1000);   // 1秒后监听点击事件
    }

    late_update() {
        this.render();
    }

    render() {
        let len = this.playground.height / 2;   // 图片边长
        if (this.state === "win") {
            this.ctx.drawImage(this.win_img, this.playground.width / 2 - len / 2, this.playground.height / 2 - len / 2, len, len);
        } else if (this.state === "lose") {
            this.ctx.drawImage(this.lose_img, this.playground.width / 2 - len / 2, this.playground.height / 2 - len / 2, len, len);
        }
    }
}
class FireBall extends AcGameObject {
    //位置x,y,半径，方向，速度，颜色，射程, 伤害
    constructor(playground, player, x, y, radius, vx, vy, color, speed, move_length, damage) {
        super();
        this.playground = playground;
        this.player = player;
        this.ctx = this.playground.game_map.ctx;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.color = color;
        this.speed = speed;
        this.move_length = move_length;
        this.damage = damage;
        this.eps = 0.01;
    }


    start() {
    }

    update() {
        if (this.move_length < this.eps) {
            this.destroy();
            return false;
        }


        this.update_move();

        // 只在自己窗口内检测碰撞
        if (this.player.character !== "enemy") {
            this.update_attack();
        }

        this.render();
    }

    // 更新火球的移动
    update_move() {
        let moved = Math.min(this.move_length, this.speed * this.timedelta / 1000);
        this.x += this.vx * moved;
        this.y += this.vy * moved;
        this.move_length -= moved;
    }

    // 更新攻击状态
    update_attack() {
        //枚举player，判断技能是否命中
        for (let i = 0; i < this.playground.players.length; i ++) {
            let player = this.playground.players[i];
            if (this.player !== player && this.is_collision(player)) {  // 不是自己发出的技能&&碰撞
                this.attack(player);
                break;
            }
        }
    }

    get_dist(x1, y1, x2, y2) {
        let dx = x1 - x2;
        let dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 判断碰撞
    is_collision(player) {
        let distance = this.get_dist(this.x, this.y, player.x, player.y);
        if (distance < this.radius + player.radius)
            return true;
        return false;
    }

    //攻击
    attack(player) {
        let angle = Math.atan2(player.y - this.y, player.x - this.x);
        player.is_attacked(angle, this.damage);

        if (this.playground.mode === "multi mode") {    // 广播攻击
            this.playground.multi_player_socket.send_attack(player.uuid, player.x, player.y, angle, this.damage, this.uuid);
        }
        this.destroy(); //技能消失
    }

    render() {
        let scale = this.playground.scale;
        this.ctx.beginPath();
        this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
    }

    on_destroy() {
        let fireballs = this.player.fireballs;
        // player的火球数组中删除火球
        for (let i = 0; i < fireballs.length; i ++) {
            if (fireballs[i] === this) {
                fireballs.splice(i, 1);
                break;
            }
        }
    }
}
class MultiPlayerSocket {
    constructor(playground) {
        this.playground = playground;

        this.ws = new WebSocket("wss://app4877.acapp.acwing.com.cn/wss/multiplayer/?token=" + playground.root.access);

        this.start();
    }

    start() {
        this.receive();
    }

    // 接收服务器发回的json数据
    receive() {
        let outer = this;

        this.ws.onmessage = function(e) {
            let data = JSON.parse(e.data);  // 将字符串转成字典
            let uuid = data.uuid;
            if (uuid === outer.uuid) {       // 忽略服务器发给自己的消息
                return false;
            }

            let event = data.event;
            if (event === "create_player") {     // 根据类型调用相应的函数处理
                outer.receive_create_player(uuid, data.username, data.photo);
            } else if (event === "move_to") {
                outer.receive_move_to(uuid, data.tx, data.ty);
            } else if (event === "shoot_fireball") {
                outer.receive_shoot_fireball(uuid, data.tx, data.ty, data.ball_uuid);
            } else if (event === "attack") {
                outer.receive_attack(uuid, data.attackee_uuid, data.x, data.y, data.angle, data.damage, data.ball_uuid);
            } else if (event === "blink") {
                outer.receive_blink(uuid, data.tx, data.ty);
            } else if (event === "message") {
                outer.receive_message(uuid, data.username, data.text);
            }
        }
    }

    get_player(uuid) {
        let players = this.playground.players;
        for (let i = 0; i < players.length; i ++ ) {
            let player = players[i];
            if (player.uuid === uuid)
                return player;
        }

        return null;
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

        player.uuid = uuid;
        this.playground.players.push(player);
    }

    send_move_to(tx, ty) {
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "move_to",
            'uuid': outer.uuid,
            'tx': tx,
            'ty': ty,
        }));
    }

    receive_move_to(uuid, tx, ty) {
        let player = this.get_player(uuid); // 找到uuid的用户，并调用他的move_to函数
        if (player) {
            player.move_to(tx, ty);
        }
    }

    send_shoot_fireball(tx, ty, ball_uuid) {
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "shoot_fireball",
            'uuid': outer.uuid,
            'tx': tx,
            'ty': ty,
            'ball_uuid': ball_uuid,
        }));
    }

    receive_shoot_fireball(uuid, tx, ty, ball_uuid) {
        let player = this.get_player(uuid);
        if (player) {
            let fireball = player.shoot_fireball(tx, ty);   // 广播发射火球
            fireball.uuid = ball_uuid;      // 火球唯一标识
        }
    }

    send_attack(attackee_uuid, x, y, angle, damage, ball_uuid) {
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "attack",
            'uuid': outer.uuid,
            'attackee_uuid': attackee_uuid,
            'x': x,
            'y': y,
            'angle': angle,
            'damage': damage,
            'ball_uuid': ball_uuid,
        }));
    }

    // 攻击者id，被攻击者id， 被攻击的x，y坐标，角度，伤害，火球id
    receive_attack(uuid, attackee_uuid, x, y, angle, damage, ball_uuid) {
        let attacker = this.get_player(uuid);
        let attackee = this.get_player(attackee_uuid);

        if (attacker && attackee) {
            attackee.receive_attack(x, y, angle, damage, ball_uuid, attacker);      // 调用player的receive_attack函数处理被攻击事件
        }
    }

    send_blink(tx, ty) {
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "blink",
            'uuid': outer.uuid,
            'tx': tx,
            'ty': ty,
        }));
    }

    receive_blink(uuid, tx, ty) {
        let player = this.get_player(uuid);
        if (player) {
            player.blink(tx, ty);
        }
    }

    send_message(username, text) {
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "message",
            'uuid': outer.uuid,
            'username': username,
            'text': text,
        }));
    }

    receive_message(uuid, username, text) {
        this.playground.chat_field.add_message(username, text);
    }
}
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
class Settings {
    constructor(root) {
        this.root = root;
        this.platform = "WEB";
        if (this.root.AcWingOS)  this.platform = "ACAPP";

        this.username = "";
        this.photo = "";

        this.$settings = $(`
<div class="ac-game-settings">
    <div class="ac-game-settings-login">
        <div class="ac-game-settings-title">
            登录
        </div>
        <div class="ac-game-settings-username">
            <div class="ac-game-settings-item">
                <input type="text" placeholder="用户名">
            </div>
        </div>
        <div class="ac-game-settings-password">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="密码">
            </div>
        </div>
        <div class="ac-game-settings-submit">
            <div class="ac-game-settings-item">
                <button>登录</button>
            </div>
        </div>
        <div class="ac-game-settings-error-message">
        </div>
        <div class="ac-game-settings-option">
            注册
        </div>
        <br>
        <div class="ac-game-settings-acwing">
            <img width="30" src="https://app165.acapp.acwing.com.cn/static/image/settings/acwing_logo.png">
            <br>
            <div>
                AcWing一键登录
            </div>
        </div>
    </div>

    <div class="ac-game-settings-register">
        <div class="ac-game-settings-title">
            注册
        </div>
        <div class="ac-game-settings-username">
            <div class="ac-game-settings-item">
                <input type="text" placeholder="用户名">
            </div>
        </div>
        <div class="ac-game-settings-password ac-game-settings-password-first">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="密码">
            </div>
        </div>
        <div class="ac-game-settings-password ac-game-settings-password-second">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="确认密码">
            </div>
        </div>
        <div class="ac-game-settings-submit">
            <div class="ac-game-settings-item">
                <button>注册</button>
            </div>
        </div>
        <div class="ac-game-settings-error-message">
        </div>
        <div class="ac-game-settings-option">
            登录
        </div>
        <br>
        <div class="ac-game-settings-acwing">
            <img width="30" src="https://app165.acapp.acwing.com.cn/static/image/settings/acwing_logo.png">
            <br>
            <div>
                AcWing一键登录
            </div>
        </div>
    </div>
</div>
`);

        this.$login = this.$settings.find(".ac-game-settings-login");
        this.$login_username = this.$login.find(".ac-game-settings-username input");
        this.$login_password = this.$login.find(".ac-game-settings-password input");
        this.$login_submit = this.$login.find(".ac-game-settings-submit button");
        this.$login_error_message = this.$login.find(".ac-game-settings-error-message");
        this.$login_register = this.$login.find(".ac-game-settings-option");

        this.$login.hide();

        this.$register = this.$settings.find(".ac-game-settings-register");
        this.$register_username = this.$register.find(".ac-game-settings-username input");
        this.$register_password = this.$register.find(".ac-game-settings-password-first input");
        this.$register_password_confirm = this.$register.find(".ac-game-settings-password-second input");
        this.$register_submit = this.$register.find(".ac-game-settings-submit button");
        this.$register_error_message = this.$register.find(".ac-game-settings-error-message");
        this.$register_login = this.$register.find(".ac-game-settings-option");


        this.$register.hide();

        this.$acwing_login = this.$settings.find(".ac-game-settings-acwing img"); // acwing 一键登录按钮

        this.root.$ac_game.append(this.$settings);

        this.start();
    }

    start() {
        if (this.platform === "ACAPP") {    // ACAPP端访问
            this.getinfo_acapp();
        } else {                            // WEB端访问
            if (this.root.access) {
                console.log(this.root.access);
                this.getinfo_web();
                this.refresh_jwt_token();
            } else {
                this.login();
            }
            this.add_listening_events();
        }
    }

    refresh_jwt_token() {
        // 每4.5min更新token
        setInterval(() => {
            $.ajax({
                url: "https://app4877.acapp.acwing.com.cn/settings/token/refresh/",
                type: "post",
                data: {
                    refresh: this.root.refresh,
                },
                success: resp => {
                    this.root.access = resp.access;
                    console.log(resp);
                }
            });
        }, 4.5 * 60 * 1000);

        setTimeout(() => {
            $.ajax({
                url: "https://app4877.acapp.acwing.com.cn/settings/ranklist/",
                type: "get",
                headers: {
                    'Authorization': "Bearer " + this.root.access,
                },
                success: resp => {
                    console.log(resp);
                }
            });
        },  5 * 1000);
    }

    add_listening_events() {
        let outer = this;

        this.add_listening_events_login();
        this.add_listening_events_register();

        this.$acwing_login.click(function() {
            outer.acwing_login();
        });
    }


    add_listening_events_login() {  //监听登录界面
        let outer = this;

        this.$login_register.click(function() {
            outer.register();
        });
        this.$login_submit.click(function() {
            outer.login_on_remote();
        });
    }


    add_listening_events_register() {   //监听注册界面
        let outer = this;

        this.$register_login.click(function() {
            outer.login();
        })
        this.$register_submit.click(function() {
            outer.register_on_remote();
        });
    }


    acwing_login() {        //AcWing一键登录
        $.ajax({
            url: "https://app4877.acapp.acwing.com.cn/settings/acwing/web/apply_code/",
            type: "GET",
            success: function(resp) {
                console.log(resp);
                if (resp.result === "success") {
                    window.location.replace(resp.apply_code_url); // 重定向当前页面到 apply_code_url
                }
            }
        });

    }

    login_on_remote(username, password) {     // 在远程服务器上登录
        username = username || this.$login_username.val();  // .val() 取出input的值
        password = password || this.$login_password.val();
        this.$login_error_message.empty();  // 清空错误信息

        $.ajax({
            url: "https://app4877.acapp.acwing.com.cn/settings/token/", // 请求令牌
            type: "post",
            data: {
                username: username,
                password: password,
            },
            success: resp => {  // 访问成功
                console.log(resp);
                this.root.access = resp.access;     // 将token和refresh保存下来
                this.root.refresh = resp.refresh;
                this.refresh_jwt_token();
                this.getinfo_web();
            },
            error: () => {
                this.$login_error_message.html("用户名或密码错误");
            }
        });

    }

    register_on_remote() {  // 在远程服务器上注册
        let username = this.$register_username.val();
        let password = this.$register_password.val();
        let password_confirm = this.$register_password_confirm.val();
        this.$register_error_message.empty();

        $.ajax({
            url: "https://app4877.acapp.acwing.com.cn/settings/register/",
            type: "post",
            data: {
                username,
                password,
                password_confirm,
            },
            success: resp => {
                console.log(resp)
                if (resp.result === "success") {
                    this.login_on_remote(username, password);
                } else{
                    this.$register_error_message.html(resp.result);
                }
            }
        });
    }

    logout_on_remote() {    // 在远程服务器上登出
        if (this.platform === "ACAPP") {
            this.root.AcWingOS.api.window.close();
        } else {
            this.root.access = "";
            this.root.refresh = "";
            location.href = "/";    // 重定向到首页
        }
    }

    register() {    //打开注册界面
        this.$login.hide();
        this.$register.show();
    }

    login() {       //打开登录界面
        this.$register.hide();
        this.$login.show();
    }


    acapp_login(appid, redirect_uri, scope, state) {    // ACAPP端登录
        // resp中存储redirect_uri函数(acapp/receive_code)返回的Json信息
        this.root.AcWingOS.api.oauth2.authorize(appid, redirect_uri, scope, state, resp => {
            if (resp.result === "success") {
                this.username = resp.username;
                this.photo = resp.photo;
                this.hide();
                this.root.menu.show();
                // 保存 access和refresh token
                this.root.access = resp.access;
                this.root.refresh = resp.refresh;
                this.refresh_jwt_token();
            }
        });
    }

    getinfo_acapp() {
        let outer = this;

        $.ajax({
            url: "https://app4877.acapp.acwing.com.cn/settings/acwing/acapp/apply_code/",
            type: "GET",
            success: function(resp) {
                if (resp.result === "success") {
                    outer.acapp_login(resp.appid, resp.redirect_uri, resp.scope, resp.state);
                }
            }
        });
    }

    getinfo_web() {
        $.ajax({
            url: "https://app4877.acapp.acwing.com.cn/settings/getinfo/",
            type: "GET",
            data: {
                platform: this.platmform,
            },
            headers: {
                'Authorization': "Bearer " + this.root.access,      //将信息传到后端 "Bearer " 定义在settings.py中
            },
            success: resp => {
                console.log(resp);
                if (resp.result === "success") {    // 登陆成功，关闭登录界面，打开菜单界面
                    this.username = resp.username;
                    this.photo = resp.photo;
                    this.hide();
                    this.root.menu.show();
                } else {
                    this.login();
                }
            }
        });
    }

    hide() {
        this.$settings.hide();
    }

    show() {
        this.$settings.show();
    }
}
export class AcGame {
    constructor(id, AcWingOS, access, refresh) {
        this.id = id;
        this.$ac_game = $('#' + id); //找到页面对象的id
        this.AcWingOS = AcWingOS;   // 如果是acapp端，该变量会带有一系列接口
        this.access = access;
        this.refresh = refresh;

        this.settings = new Settings(this);
        this.menu = new AcGameMenu(this);
        this.playground = new AcGamePlayground(this);

        this.start();
    }

    start() {
    }
}
