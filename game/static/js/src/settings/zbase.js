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
