import { FLIP_H_SIDE, PLAYER_POWER_PUNCHES_TYPE } from "../../const";
import { Actor } from "./actor";
import { Decoy } from "./decoy";

export function Player(_root, container, x, y) {
    var POWER_PUNCHES = [PLAYER_POWER_PUNCHES_TYPE.PISTOL, PLAYER_POWER_PUNCHES_TYPE.TELEPORT, PLAYER_POWER_PUNCHES_TYPE.SUPER_TWINS];
    var DEFAULT_HEALTH = 8;
    var a = new Actor(_root, container).init();

    return Object.assign(a, this, {
        init: function() {
            this.health = DEFAULT_HEALTH;
            this.powerMeter = 0;
            this.maxPowerMeter = 10;
            this._healthCounter = 1;
            this._powerAttackRange = 160;
            this.usedPowerPunchType = PLAYER_POWER_PUNCHES_TYPE.NONE;
            this.powerPunchClones = [];
            this.timeouts.powerPunchAnticipation = null;
            this.decoys = [];
            this.totalDecoys = 10;
            this.usedPowerPunchSlots = [];
            this.create("player_", { height: 16, x: x, y: y });
            this.setAnimatonStates({
                run: { frames: this.getFrames(this.skin, "player_run_"), fps: 8, loop: true },
                idle: { frames: this.getFrames(this.skin, "player_idle_"), fps: 8, loop: true },
                die: { frames: this.getFrames(this.skin, "player_die"), fps: 8, loop: false },
                jump: { frames: this.getFrames(this.skin, "player_jump"), fps: 8, loop: false },
                hurt: { frames: this.getFrames(this.skin, "player_hurt"), fps: 8, loop: false },
                punch: { frames: this.getFrames(this.skin, "player_punch"), fps: 8, loop: false },
                powerPunch: { frames: this.getFrames(this.skin, "player_power_punch_"), fps: 8, loop: false }
            });
            this.states.levitate = this.states.jump;
            this.healthTicker = new this.g.Ticker();
            this._root.playerHealthBar.totalAmount = this.health;
            this._root.playerPowerBar.totalAmount = this.maxPowerMeter;
            this.playAnimation(this.skin, "idle");
            this.createAttackHitArea();
            this.createIndicator();
            this.startUpdate();
            return this;
        },

        createIndicator: function() {
            this.indicator = this.g.rectangle(1, 3, "red", "", 0, 0, 0);
            this.container.addChild(this.indicator);
            this.indicator.visible = false;
        },

        onUpdate: function() {
            this.autoUpdateHealthPack();

            if (this.usedPowerPunchType !== PLAYER_POWER_PUNCHES_TYPE.SUPER_TWINS) {
                if (!this._root.screen.powerAttackScreen.visible) {
                    if (!this.isAttack && !this.isDead) {
                        this.updateMovement();
                    }
                    if (this.isAllowAttack && !this.isDead && this.isOnGround) {
                        this.updateAttack();
                    }
                }
                this.updateToGravity();
            }
            this.vsPlatforms(this._root.background.platforms);
            this.checkAndCleanDecoys();
            this.updateSkinToBody();
            this.updateAttackHitAreaToBody();
            this.updatePowerAttackBehaviour();
            this.updateIndicator();
        },

        updateIndicator: function() {
            this.indicator.x = this.body.centerX - this.indicator.halfWidth;
            this.indicator.y = this.body.y - this.indicator.height;
            this.indicator.visible = Boolean(this.decoys.length && this.playState !== "levitate");
        },

        updatePowerAttackBehaviour: function() {
            if (this.isPowerAttackUsed && this.g._startTime % 2 === 0) {
                this.powerMeter -= 1;
            }

            if (this.powerMeter <= 0 && this.usedPowerPunchType !== PLAYER_POWER_PUNCHES_TYPE.SUPER_TWINS) {
                this.powerMeter = 0;
                this.resetPowerAttack();
            }
            this._root.playerPowerBar.updateBar(this.powerMeter);

            if (this.usedPowerPunchType === PLAYER_POWER_PUNCHES_TYPE.PISTOL && this._root.screen.powerAttackScreen.visible && !this.powerPunchClones.length) {
                this.createPowerPunchClones();
            }
        },

        updatePowerMeter: function(amount) {
            if (this.isPowerAttack || this.decoys.length ) { return; }
            if (this.powerMeter < this.maxPowerMeter) {
                this.powerMeter += amount;
            } else {
                this.isPowerAttack = true;
            }
        },

        autoUpdateHealthPack: function() {
            this.healthTicker.run();
            if (this.healthTicker.tick && this.healthTicker.tick % 500 === 0 && this.health < DEFAULT_HEALTH && this.health) {
                this.health += this._healthCounter;
            }
            this._root.playerHealthBar.updateBar(this.health);
        },

        updateMovement: function() {
            if (this.isOnGround) {
                this.updateOnGroundCommonProps();
            }

            if (this.vy > 0) {
                this.isFalling = true;
            }

            this.updateBodyVelocityX();
            if (this._root.isKeyPressed("right") || this._root.isKeyPressed("left")) {
                this.vx = this.flipH * this.speedX;
                this.checkAndPlayAnimation("run");
            }
            if (this._root.isKeyPressed("right")) {
                this.flip(FLIP_H_SIDE.RIGHT.side);
            } else if (this._root.isKeyPressed("left")) {
                this.flip(FLIP_H_SIDE.LEFT.side);
            } else {
                this.vx = 0;
                this.checkAndPlayAnimation("idle");
            }

            if (this._root.isKeyPressed("up")) {
                if (this.isOnGround) {
                    this.forceJump();
                }
            }
        },

        updateAttack: function() {
            if (this._root.isKeyPressed("attack") && this.isAllowAttack) {
                this.killTimeout("powerPunchAnticipation");

                var attackAnimation = this.isPowerAttack && !this.isPowerAttackUsed ? "powerPunch" : "punch";
                var powerPunchAnticipationDuration = 300;

                if (this.isPowerAttack && !this.isPowerAttackUsed && !this.decoys.length) {
                    this.isPowerAttackUsed = true;
                    this.usedPowerPunchType = this.getNewPowerPunch();

                    powerPunchAnticipationDuration = this.usedPowerPunchType === PLAYER_POWER_PUNCHES_TYPE.SUPER_TWINS ? 100 : powerPunchAnticipationDuration;
                    this.showPowerAttackScreen(this.usedPowerPunchType);

                    this.timeouts.powerPunchAnticipation = setTimeout(function() {
                        this.usePowerPunch(this.usedPowerPunchType);
                    }.bind(this), powerPunchAnticipationDuration);
                }
                this._root.sound.play("fxPunch");
                this.attack(attackAnimation);
            }
        },

        showPowerAttackScreen: function(powerType) {
            switch(powerType) {
                case PLAYER_POWER_PUNCHES_TYPE.TELEPORT:
                    this._root.screen.showPowerAttackScreen(this.usedPowerPunchType, {
                        x: this.body.centerX,
                        y: this.body.y + this.body.height - 10,
                        height: 2,
                        width: this._powerAttackRange,
                        flipH: this.flipH
                    });
                    break;
                default:
                    this._root.screen.showPowerAttackScreen(this.usedPowerPunchType);
            }
        },

        getNewPowerPunch: function() {
            var powerPunch = this.getArrayRandomValue(POWER_PUNCHES);

            // don't use the same power more than twice,
            // if so then, shuffle again excluding the re-occured power
            if (this.usedPowerPunchSlots.length >= 2) {
                if (this.usedPowerPunchSlots[this.usedPowerPunchSlots.length-1] === powerPunch &&
                    this.usedPowerPunchSlots[this.usedPowerPunchSlots.length-2] === powerPunch) {
                    var newPowerPunches = POWER_PUNCHES.filter(function(powerType) { return powerType !== powerPunch; });
                    powerPunch = this.getArrayRandomValue(newPowerPunches);
                    this.usedPowerPunchSlots.length = 0;
                }
            }
            this.usedPowerPunchSlots.push(powerPunch);
            return powerPunch;
        },

        usePowerPunch: function(powerType) {
            var x;
            var animation = "idle";

            switch(powerType) {
                case PLAYER_POWER_PUNCHES_TYPE.PISTOL:
                    animation = "";
                    x = this.getSafestMoveXRange(this.body, this.getReversedFlipH(), this.skin.width*2);
                    this.forceMoveTo(this.flipH, x);
                    this._root.sound.play("fxPistol");
                    break;
                case PLAYER_POWER_PUNCHES_TYPE.TELEPORT:
                    x = this.getSafestMoveXRange(this.body, this.flipH, this._powerAttackRange);
                    this.forceMoveTo(this.flipH, x);
                    this._root.sound.play("fxTele");
                    break;
                case PLAYER_POWER_PUNCHES_TYPE.SUPER_TWINS:
                    animation = "levitate";
                    this.body.y = this._root.config.height/2;
                    this.createDecoys();
                    this._root.sound.play("fxSuperT");
                    break;
            }
            if (animation) {
                this.playAnimation(this.skin, animation);
            }
        },

        checkAndCleanDecoys: function() {
            for (var i = 0; i < this.decoys.length; i++) {
                var decoy = this.decoys[i];
                if (!decoy) {
                    this.decoys.splice(i, 1);
                    continue;
                }
                if (decoy.isDestroy) {
                    this.decoys[i] = null;
                }
            }
        },

        checkAndPlayAnimation: function(name) {
            if (!this.isJumping && !this.isFalling && !this.isTakeDamage) {
                this.playAnimation(this.skin, name);
            }
        },

        createPowerPunchClones: function(total) {
            var totalClones = total || this._powerAttackRange/this.skin.width;
            for (var i = 0; i < totalClones; i++) {
                var sprite = this.createSprite("player_");
                sprite.gotoAndStop(this.states.powerPunch.frames[0]);
                sprite.x = this.skin.x + this.skin.width * this.flipH + sprite.width * (totalClones-i) * this.flipH;
                sprite.y = this.body.y;
                sprite.scaleX = this.skin.scaleX;
                sprite.alpha = 0.1*i;
                this.container.addChild(sprite);
                this.powerPunchClones.push(sprite);
                setTimeout(function() {
                    sprite.parent.removeChild(sprite); 
                    if (totalClones === this.powerPunchClones.length) {
                        this.powerPunchClones.length = 0;
                    }
                }.bind(this), 100*i);
            }
        },

        createDecoys: function() {
            var flips = [FLIP_H_SIDE.LEFT.value, FLIP_H_SIDE.RIGHT.value];
            var defaultSpawnDuration = 200;
            var defaultRunDuration = 20;
            var flipIndex = 0;

            for (var i = 0; i < this.totalDecoys; i++) {
                flipIndex ++;
                flipIndex = flipIndex >= flips.length ? 0 : flipIndex;
                var runDuration = i ? defaultRunDuration * i * 2 : defaultRunDuration;
                var spawnDuration = i ? defaultSpawnDuration * i * 2 : defaultSpawnDuration;
                var decoy = new Decoy(this._root, this._root.decoysContainer, {
                        sprite: "player_",
                        flipH: flips[flipIndex],
                        x: this.body.x,
                        y: this.body.y,
                        runDuration: runDuration,
                        spawnDuration: spawnDuration
                    }).init();
                this.decoys.push(decoy);
            }

            // reset powerAttack after creation
            setTimeout(function() {
                this.resetPowerAttack(true);
            }.bind(this), defaultSpawnDuration * 2 * this.totalDecoys);
        },

        resetPowerAttack: function(isResetAll) {
            this.isPowerAttackUsed = false;
            this.isPowerAttack = false;
            this.usedPowerPunchType = PLAYER_POWER_PUNCHES_TYPE.NONE;
            if (isResetAll) {
                this.isAttack = false;
                this.middlewareOnCompleteAttack();
                this.isAllowAttack = true;
            }
        },

        onSkinAnimationComplete: function() {
            var duration = 300;
            switch(this.playState) {
                case "punch":
                    this.onCompleteAttack(duration);
                case "powerPunch":
                    duration = 600; 
                    this.onCompleteAttack(duration, null, false, true);
                    break;
                case "hurt":
                    this.isTakeDamage = false;
                    break;
            }
        },

        middlewareOnKill: function() {
            this._root.gameOver();
        }

    });
}
