import { GA } from "./core/ga";
import { BEHAVIOUR_STATES, FLIP_H_SIDE } from "./const";
import { Enemy } from "./gameObjects/actor/enemy";
import { Player } from "./gameObjects/actor/player";
import { Background } from "./gameObjects/background";
import { GameScreen } from "./gameObjects/gameScreen";
import { HUD } from "./gameObjects/hud";
import { gameAssets } from "../media/images/game-assets";
import { gameImageBase64 } from "../media/images/gameImageBase64";
import { SoundBox } from "./soundBox";

export function InitGame() {
    var gameOverScreen = document.getElementById("game-over");
    var bottomBar = document.getElementById("bottom-bar");
    var killMeter = document.getElementById("kill-meter");
    var gameArea = document.getElementById("gameArea");

    return {
        config: {
                width: 320,
                height: 120,
                fps: 30,
                // enable this to see collision shapes.
                debug: false,
                // enable this to debug game components directly from console.
                injectToWindow: false,
                keyCodes: {
                    up: 38,
                    down: 40,
                    left: 37,
                    right: 39,
                    attack: 67, // "C"
                    start: 90 // "Z"
                },
                maxEnemies: 1000
        },

        init: function() {
            this.g = GA.create({
                width: this.config.width,
                height: this.config.height,
                view: gameArea,
                setup: this._setup.bind(this),
                assets: {
                    data: gameAssets,
                    img: gameImageBase64
                }, 
                keyCodes: this.config.keyCodes
            });
            this.g.start();
            this.g.fps = this.config.fps;
            this._initResize();
            this.sound = SoundBox.init();
            // for debug
            window.game = this.config.injectToWindow ? this : undefined;
            return this;
        },

        _initResize: function() {
            this._resizeGame();
            window.addEventListener("resize", this._resizeGame.bind(this), false);
            window.addEventListener("orientationchange", this._resizeGame.bind(this), false);
        },

        _setup: function() {
            this.gameContainer = this.g.group();
            this.instructionTicker = new this.g.Ticker();
            this.enemies = [];
            this.enemiesKilled = 0;
            this.isGameOver = false;
			this.killMeterTimeout = null;
            this._setupScene();
            this.g.state = this._update.bind(this);
            this.restart();
            this.sound.music();
        },

        _setupScene: function() {
            this.levelContainer = this.g.group();
            this.gameContainer.addChild(this.levelContainer);
            this.background = new Background(this, this.levelContainer).init();
            this.playerHealthBar = new HUD(this, this.levelContainer, {
                x: 0,
                y: 0,
                width: 100,
                height: 5
            }).init();
            this.playerPowerBar = new HUD(this, this.levelContainer, { 
                x: 0,
                y: 5,
                width: 80,
                height: 5,
                fgColor: "#fbd505",
                bgColor: "#0e0c01"
            }).init();
            this.enemiesContainer = this.g.group();
            this.levelContainer.addChild(this.enemiesContainer);
            this.decoysContainer = this.g.group();
            this.levelContainer.addChild(this.decoysContainer);
            // player
            this.player = new Player(this, this.levelContainer, 150, 80).init();
            this.powerScreenContainer = this.g.group();
            this.levelContainer.addChild(this.powerScreenContainer);
            this.screen = new GameScreen(this, this.powerScreenContainer).init();
        },

        _update: function() {
            if (!this.isGameOver) {
                this.respawnEnemies();
                this.updateInstruction();
                this.updateKillMeter();
                this.checkGameWin();
            } else {
                if (this.isKeyPressed("start")) {
                    this.restart();
                }
            }
        },

        updateInstruction: function() {
            this.instructionTicker.run();
            if (!this.instructionTicker.isStop && this.instructionTicker.tick && this.instructionTicker.tick % 300 === 0) {
                this.instructionTicker.stop();
                this.showInstruction(false);
            }
        },

        updateKillMeter: function() {
            killMeter.innerHTML = this.enemiesKilled + " of " + this.config.maxEnemies;
        },

		setKillMeterScale: function(scale) {
			killMeter.style.transform = "scale(" + scale + ")";
		},

		clearKillMeterTimeout: function() {
			clearTimeout(this.killMeterTimeout);
			this.killMeterTimeout = null;
		},

        incrementEnemiesKilled: function() {
            this.enemiesKilled ++;
            // animate kill meter
			if (this.killMeterTimeout) { return; }
			this.setKillMeterScale(1.2);
			this.killMeterTimeout = setTimeout(function() {
				this.setKillMeterScale(1);
				this.clearKillMeterTimeout();
			}.bind(this), 20);
        },

        respawnEnemies: function() {
            if (this.g._startTime % 10 === 0 && !this.player.isDead && this.enemies.length < this.config.maxEnemies) {
                // enemies
                var choices = [BEHAVIOUR_STATES.ATTACK, BEHAVIOUR_STATES.NONE];
                var choiceIndex =  this.g.randomInt(0, choices.length-1);
                var choice = choices[choiceIndex];

                var spawnSides = [FLIP_H_SIDE.LEFT.side, FLIP_H_SIDE.RIGHT.side];
                var spawnIndex =  this.g.randomInt(0, spawnSides.length-1);
                var spawnSide = spawnSides[spawnIndex];
                var enemy = new Enemy(this, this.enemiesContainer, this.enemies.length, spawnSide, choice).init();
                this.enemies.push(enemy);
            }
        },

        _resizeGame: function() {
            var innerHeight = window.innerHeight;
            var innerWidth = window.innerWidth;
            var ratioWidth = (innerWidth / this.g.canvas.width);
            var top = -(this.g.canvas.height - innerHeight) / 2;
            var left = -(this.g.canvas.width - innerWidth) / 2;
            gameArea.style.transform = "scale(" + ratioWidth + ")";
            gameArea.style.top = top.toString() + "px";
            gameArea.style.left = left.toString() + "px";
        },

        isKeyPressed: function( key ) {
            return this.g.key[key].isDown;
        },

        checkGameWin: function() {
            if (this.enemiesKilled >= this.config.maxEnemies) {
                this.gameOver(true);
				this.destroyEnemies();
            }
        },

        showGameOver: function(isShow, isWin) {
            var text = !isWin ? "<br>GAME OVER" : "You Are a Hero!<br>They ran away.<br>They got the taste of One Punch.";
            gameOverScreen.innerHTML = isShow ? text + "<br><span id='restart-text'>Press Z to Restart</span>" : "";
            gameOverScreen.style.visibility = isShow ? "visible" : "hidden"; 
        },

        showInstruction: function(isShow) {
            bottomBar.innerHTML = isShow ? "<p>Press C to PUNCH & arrow-keys to MOVE & JUMP</p>" : "";
        },

        gameOver: function(isWin) {
            this.showGameOver(true, isWin);
            this.isGameOver = true;
            this.instructionTicker.stop();
        },

		destroyEnemies: function() {
            this.enemies.forEach(function(enemy) {
                enemy.isDead = true;
				enemy.forceKill();
                enemy.stopUpdate();
				enemy.removeSkinBody();
            }.bind(this));
            this.enemies.length = 0;
            this.enemiesKilled = 0;
		},

        restart: function() {
            this.showGameOver(false);
            this.showInstruction(true);
            this.isGameOver = false;
            this.background = null;
			this.clearKillMeterTimeout();
            this.player = null;
			this.destroyEnemies();
            this.g.updateFunctions.length = 0;
            this.gameContainer.removeChild(this.levelContainer);
            this._setupScene();
            this.instructionTicker.enable();
        }
    };
}

//load and focus; useful if the game is loaded inside an iframe
window.onload = function() {
    new InitGame().init();
    window.focus();
    document.body.addEventListener("click", function (e) {
        window.focus();
    }, false);
};
