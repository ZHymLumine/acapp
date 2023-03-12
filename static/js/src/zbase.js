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
