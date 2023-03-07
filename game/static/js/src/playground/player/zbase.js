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
                return false;

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
        $(window).keydown(function(e) {
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

        if (this.character === "me" && this.playground.state === "fighting") {
            this.update_coldtime();
        }
        this.update_move();
        this.render();
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
        if (this.character === "me") {
            this.playground.state = "over";
        }

        for (let i = 0; i < this.playground.players.length; i++) {
            let player = this.playground.players[i];
            if (this === player) {
                if (this.character === "me") {
                    this.detach_listening_events();
                    //console.log("me is out");
                }
                this.playground.players.splice(i, 1);
                break;
            }
        }
    }
}
