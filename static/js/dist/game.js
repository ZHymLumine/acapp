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
    last_timestamp = timestamp;

    requestAnimationFrame(AC_GAME_ANIMATION);  //递归地画下一帧
}

requestAnimationFrame(AC_GAME_ANIMATION);

class GameMap extends AcGameObject {
    constructor(playground) {
        super();
        this.playground = playground;
        this.$canvas = $(`<canvas></canvas>`);  //画布
        this.ctx = this.$canvas[0].getContext('2d');
        this.ctx.canvas.width = this.playground.width;
        this.ctx.canvas.height = this.playground.height;
        this.playground.$playground.append(this.$canvas);
    }

    start() {
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

        if (this.character !== "robot") {   // 不是机器人时渲染自己或敌人的头像
            this.img = new Image();
            this.img.src = this.photo;
        }
    }

    start() {
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
            const rect = outer.ctx.canvas.getBoundingClientRect();  //获取画布的矩形
            if (e.which === 3) {  //鼠标右键
                outer.move_to((e.clientX - rect.left) / outer.playground.scale, (e.clientY - rect.top) / outer.playground.scale); //鼠标点击坐标相对于整个屏幕，映射到画布中的坐标
            } else if (e.which === 1) { //左键
                if (outer.cur_skill === "fireball") {
                    outer.shoot_fireball((e.clientX - rect.left) / outer.playground.scale, (e.clientY - rect.top) / outer.playground.scale);
                }
                outer.cur_skill = null;
            }
        });
        //获取键盘事件
        $(window).keydown(function(e) {
            if (e.which === 81) {    // q键
                outer.cur_skill = "fireball";
                return false;
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
        new FireBall(this.playground, this, x, y, radius, vx, vy, color, speed, move_length, damage);
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


    update() {
        this.update_move();

        this.render();
    }

    update_move() {
        this.spent_time += this.timedelta / 1000;   //游戏经过时间

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

    }

    on_destroy() {
        for (let i = 0; i < this.playground.players.length; i++) {
            let player = this.playground.players[i];
            if (this === player) {
                if (this.character === "me") {
                    this.detach_listening_events();
                    //console.log("me is out");
                }
                this.playground.players.splice(i, 1);
            }
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

        // 火球移动
        let moved = Math.min(this.move_length, this.speed * this.timedelta / 1000);
        this.x += this.vx * moved;
        this.y += this.vy * moved;
        this.move_length -= moved;

        //枚举player，判断技能是否命中
        for (let i = 0; i < this.playground.players.length; i ++) {
            let player = this.playground.players[i];
            if (this.player !== player && this.is_collision(player)) {  // 不是自己发出的技能&&碰撞
                this.attack(player);
            }
        }
        this.render();
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
        this.destroy(); //技能消失
    }

    render() {
        let scale = this.playground.scale;
        this.ctx.beginPath();
        this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
    }
}
class MultiPlayerSocket {
    constructor(playground) {
        this.playground = playground;

        this.ws = new WebSocket("wss://app4877.acapp.acwing.com.cn/wss/multiplayer/");

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
        /*
        this.ws.send(JSON.stringify({
            'message': "hello acapp server",
        }))*/
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

    start() { //显示playground界面
        let outer = this;
        $(window).resize(function() {
            outer.resize();
        });
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
            this.multi_player_socket = new MultiPlayerSocket(this);
            this.multi_player_socket.uuid = this.players[0].uuid;   // 自己的uuid(始终是第一个player)

            this.multi_player_socket.ws.onopen = function() {     // 连接建立后，向server发送消息
                outer.multi_player_socket.send_create_player(outer.root.settings.username, outer.root.settings.photo);
            }
        }
    }

    hide() {        // 关闭playground界面
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
            this.getinfo_web();
            this.add_listening_events();
        }
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

    login_on_remote() {     // 在远程服务器上登录
        let outer = this;
        let username = this.$login_username.val();  // .val() 取出input的值
        let password = this.$login_password.val();
        this.$login_error_message.empty();  // 清空错误信息

        $.ajax({
            url: "https://app4877.acapp.acwing.com.cn/settings/login/",
            type: "GET",
            data: {
                username: username,
                password: password,
            },
            success: function(resp) {
                console.log(resp);
                if (resp.result === "success") {
                    location.reload();      // 刷新页面
                } else {
                    outer.$login_error_message.html(resp.result);   // 打印错误信息
                }
            }
        });

    }

    register_on_remote() {  // 在远程服务器上注册
        let outer = this;
        let username = this.$register_username.val();
        let password = this.$register_password.val();
        let password_confirm = this.$register_password_confirm.val();
        this.$register_error_message.empty();

        $.ajax({
            url: "https://app4877.acapp.acwing.com.cn/settings/register",
            type: "GET",
            data: {
                username: username,
                password: password,
                password_confirm: password_confirm,
            },
            success: function(resp){
                console.log(resp)
                if (resp.result === "success") {
                    location.reload();
                } else{
                    outer.$register_error_message.html(resp.result);
                }
            }
        });
    }

    logout_on_remote() {    // 在远程服务器上登出
        if (this.platform === "ACAPP") return false;    // 只在WEB端退出

        $.ajax({
            url: "https://app4877.acapp.acwing.com.cn/settings/logout/",
            type: "GET",
            success: function(resp){
                console.log(resp);
                if(resp.result === "success") {
                    location.reload();
                }
            }
        });
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
        let outer = this;
        // resp中存储redirect_uri函数(acapp/receive_code)返回的Json信息
        this.root.AcWingOS.api.oauth2.authorize(appid, redirect_uri, scope, state, function(resp) {
            console.log("called from acapp_login function");
            console.log(resp);
            if (resp.result === "success") {
                outer.username = resp.username;
                outer.photo = resp.photo;
                outer.hide();
                outer.root.menu.show();
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
        let outer = this;
        $.ajax({
            url: "https://app4877.acapp.acwing.com.cn/settings/getinfo/",
            type: "GET",
            data: {
                platform: outer.platmform,
            },
            success: function(resp) {
                console.log(resp);
                if (resp.result === "success") {    // 登陆成功，关闭登录界面，打开菜单界面
                    outer.username = resp.username;
                    outer.photo = resp.photo;
                    outer.hide();
                    outer.root.menu.show();
                } else {
                    outer.login();
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
    constructor(id, AcWingOS) {
        this.id = id;
        this.$ac_game = $('#' + id); //找到页面对象的id

        this.AcWingOS = AcWingOS;   // 如果是acapp端，该变量会带有一系列接口

        this.settings = new Settings(this);
        this.menu = new AcGameMenu(this);
        this.playground = new AcGamePlayground(this);

        this.start();
    }

    start() {
    }
}
