class Player extends AcGameObject {
    constructor(playground, x, y, radius, color, speed, is_me) {
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
        this.is_me = is_me;
        this.eps = 0.1;
        this.friction = 0.9     // 摩擦系数，作用于受击速度
        this.spent_time = 0;    // 游戏时长
        this.cur_skill = null; //当前技能（非快捷施法）
    }

    start() {
        if (this.is_me) {    //如果是自己，用鼠标键盘操作
            this.add_listening_events();
        } else {    //AI敌人
            let tx = Math.random() * this.playground.width;     //随机一个地点，让敌人走过去
            let ty = Math.random() * this.playground.height;
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
            if (e.which === 3) {  //鼠标右键
                outer.move_to(e.clientX, e.clientY);
            } else if (e.which === 1) { //左键
                if (outer.cur_skill === "fireball") {
                    outer.shoot_fireball(e.clientX, e.clientY);
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
        let radius = this.playground.height * 0.01;
        let angle = Math.atan2(ty - this.y, tx - this.x);
        let vx = Math.cos(angle), vy = Math.sin(angle);
        let color = "orange";
        let speed = this.playground.height * 0.5;
        let move_length = this.playground.height * 1;
        let damage = this.playground.height * 0.01;
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
            let speed = this.speed * 50;
            let move_length = this.radius * Math.random() * 5;
            new Particle(this.playground, x, y, radius, vx, vy, color, speed, move_length);
        }

        this.radius -= damage;      //球的大小作为血量
        if (this.radius < 10) {
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
        this.spent_time += this.timedelta / 1000;   //游戏经过时间

        // 游戏时间大于4秒，每300帧AI发射一个火球
        if(!this.is_me && this.spent_time > 4 && Math.random() < 1 / 180.0) {
            let player = this.playground.players[Math.floor(Math.random() * this.playground.players.length)]; //随机一个目标
            if (this !== player) {
                //射向0.3秒后的位置
                let tx = player.x + player.speed * player.vx * this.timedelta / 1000 * 0.3;
                let ty = player.y + player.speed * player.vy * this.timedelta / 1000 * 0.3;
                this.shoot_fireball(tx, ty);
            }
        }

        if (this.damage_speed > 10) {   // 受到攻击, 后退
            this.vx = this.vy = 0;
            this.move_length = 0;
            this.x += this.damage_x * this.damage_speed * this.timedelta / 1000;
            this.y += this.damage_y * this.damage_speed * this.timedelta / 1000;
            this.damage_speed *= this.friction;     // 速度递减(受击后先后退快，逐渐变慢)
        } else {
            if (this.move_length < this.eps) {
                this.move_length = 0;
                this.vx = this.vy = 0;
                if (!this.is_me) {  //AI走到目的地时，再随机一个目标位置
                    let tx = Math.random() * this.playground.width;     //随机一个地点，让敌人走过去
                    let ty = Math.random() * this.playground.height;
                    this.move_to(tx, ty);
                }
            } else {
                let moved = Math.min(this.move_length, this.speed * this.timedelta / 1000);  //求移动距离
                this.x += this.vx * moved;
                this.y += this.vy * moved;
                this.move_length -= moved;
            }
        }
        this.render();
    }

    render() {
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
    }

    on_destroy() {
        for (let i = 0; i < this.playground.players.length; i++) {
            let player = this.playground.players[i];
            if (this === player) {
                if (this.is_me) {
                    this.detach_listening_events();
                    //console.log("me is out");
                }
                this.playground.players.splice(i, 1);
            }
        }
    }
}
