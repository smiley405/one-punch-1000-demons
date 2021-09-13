import { Actor } from "./actor";
import { BEHAVIOUR_STATES, FLIP_H_SIDE, PLAYER_POWER_PUNCHES_TYPE } from "../../const";

export function Enemy(_root, container, index, spawnSide, forceChoice) {
    var ENEMY_CHOICES_TYPE = {
        STAND: "stand",
        ATTACK: "attack",
        RUN_AWAY: "run_away"
    };
    var CHOICES = [ENEMY_CHOICES_TYPE.STAND, ENEMY_CHOICES_TYPE.ATTACK, ENEMY_CHOICES_TYPE.RUN_AWAY];
    var a = new Actor(_root, container).init();

    return Object.assign(a, this, {
        init: function() {
            this.index = index;
            this.health = 2;
            this.timeouts.stand = null;
            this.timeouts.kill = null;
            this.targetXToFollow = 0;
            this.speedX = 2;
            this.forceChoice = forceChoice;
            this.create("enemy_", { height: 16 });
            this.setAnimatonStates({
                run: { frames: this.getFrames(this.skin, "enemy_run_"), fps: 8, loop: true },
                idle: { frames: this.getFrames(this.skin, "enemy_idle_"), fps: 7, loop: true },
                die: { frames: this.getFrames(this.skin, "enemy_die"), fps: 8, loop: false },
                jump: { frames: this.getFrames(this.skin, "enemy_jump"), fps: 8, loop: false },
                hurt: { frames: this.getFrames(this.skin, "enemy_hurt"), fps: 8, loop: false },
                punch: { frames: this.getFrames(this.skin, "enemy_punch"), fps: 8, loop: false }
            });
            this.spawn(spawnSide);
            this.playAnimation(this.skin, "idle");
            this.createAttackHitArea();
            this.startUpdate();
            return this;
        },

        spawn: function(side) {
            var wall1 = this._root.background.wall1;
            var wall2 = this._root.background.wall2;
            this.flip(side);
            this.body.y = 80;
            this.body.x = side === FLIP_H_SIDE.RIGHT.side ? wall2.centerX + this.body.height: wall1.centerX - this.body.height;
        },

        onUpdate: function() {
            if (this._root.player.isDead) {
                this.playAnimation(this.skin, "idle");
                return;
            }

            if (!this.isDead) {
                if (this._root.player.isAttack && this._root.player.isPowerAttackUsed) {
					this.choiceStand(1000);
					this.playAnimation(this.skin, "idle");
                } else {
                    this.updateMovement();
                }
            }
            this.updateToGravity();
            this.vsPlatforms([this._root.background.ground]);
            if (this.isOnGround && !this.isDead) {
                this.vsWalls();
                this.vsDecoys();
                if (this._root.screen.powerAttackScreen.visible) {
                    this.checkPowerAttackHitFromPlayer();
                } else {
                    this.checkAttackHitFromPlayer();
                }
            }
            this.updateSkinToBody();
            this.updateAttackHitAreaToBody();
        },

        updateMovement: function() {
            if (this.isOnGround) {
                this.updateOnGroundCommonProps();
                if (this.activeBehaviourState === BEHAVIOUR_STATES.NONE) {
                    this.vsPlayer();
                }
            }

            if (this.vy > 0) {
                this.isFalling = true;
            }
            this.updateBodyVelocityX();
            if (this.activeBehaviourState === BEHAVIOUR_STATES.FOLLOW_PLAYER_LEFT ||
                this.activeBehaviourState === BEHAVIOUR_STATES.FOLLOW_PLAYER_RIGHT ||
                this.activeBehaviourState === BEHAVIOUR_STATES.RUN_AWAY_LEFT ||
                this.activeBehaviourState === BEHAVIOUR_STATES.RUN_AWAY_RIGHT) {

                this.vx = this.flipH * this.speedX;
                if (!this.isJumping && !this.isFalling && !this.isTakeDamage) {
                    this.playAnimation(this.skin, "run");
                }

                if (this.isWithinTargetRange(this.body.centerX, this.targetXToFollow)) {
                    this.autoDetectChoices();
                }
            } else {
                this.ignoreWallNameForCollision = "";
                this.vx = 0;
                if (!this.isJumping && !this.isFalling && !this.isTakeDamage) {
                    if (this.activeBehaviourState === BEHAVIOUR_STATES.STAND) {
                        this.playAnimation(this.skin, "idle");
                    }
                }
            }
        },

        vsPlayer: function() {
            this.killTimeout("stand");
            this.activeBehaviourState = BEHAVIOUR_STATES.NONE;
            if (!this.isWithinTargetRange()) {
                if (this.activeBehaviourState !== BEHAVIOUR_STATES.FOLLOW_PLAYER_LEFT ||
                    this.activeBehaviourState !== BEHAVIOUR_STATES.FOLLOW_PLAYER_RIGHT) {
                    this.followPlayer();
                }
            } else {
                this.autoDetectChoices();
            }
        },

        vsDecoys: function() {
            for (var i = 0; i < this._root.player.decoys.length; i++) {
                var decoy = this._root.player.decoys[i];
                if (decoy && decoy.body && !decoy.isDestroy && decoy.isAttack) {
                    if (this.isWithinTargetRange(this.body, decoy.body, 20)) {
                        this.updateOnReceiveDamage(1, decoy, false);
                    }
                }
            }
        },

        checkAttackHitToPlayer: function() {
            if (this.isDead || this._root.player.isAttack) { return; }
            var testResult = this.g.hitTest({
                target: this._root.player.body,
                source: this.attackHitArea
            });
            if (testResult.hit) {
                this._root.player.receiveDamage(this.damage, this.getReversedFlipH(this.flipH), 2);
                var x = this.getSafestMoveXRange(this._root.player.body, this.flipH, this._root.player.body.width/2);
                this._root.player.forceMoveTo(this._root.player.flipH, x);
            }
        },

        checkAttackHitFromPlayer: function() {
            if (this._root.player.isDead) { return; }
            var testResult = this.g.hitTest({
                source: this._root.player.attackHitArea,
                target: this.body
            });
            if (testResult.hit && this._root.player.isAttack) {
                this.updateOnReceiveDamage();
            }
        },

        checkPowerAttackHitFromPlayer: function() {
            if (this._root.player.isDead) { return; }

            if (this._root.player.usedPowerPunchType === PLAYER_POWER_PUNCHES_TYPE.TELEPORT) {
                this.vsPowerAttackScreen();
            } else {
                if (this.isSeenByPlayer()) {
                    if (this.isWithinTargetRange(this.body, this._root.player.body, this._root.player._powerAttackRange) &&
						this._root.player.usedPowerPunchType !== PLAYER_POWER_PUNCHES_TYPE.SUPER_TWINS) {
                        this.updateOnReceiveDamage(this.health);
                    }
                }
            }
        },

        vsPowerAttackScreen: function() {
            var testResult = this.g.hitTest({
                target: this._root.screen.powerAttackScreen,
                source: this.body
            });
            if (testResult.hit) {
                this.updateOnReceiveDamage(this.health);
            }
        },

        updateOnReceiveDamage: function(damage, other, isUpdatePowerMeter) {
            other = other || this._root.player;
            isUpdatePowerMeter = isUpdatePowerMeter !== undefined ? isUpdatePowerMeter : true;
            this.choiceStand();
            this.receiveDamage(damage || this.damage, this.getReversedFlipH(other.flipH), 3, other.flipH);
            var x = this.getSafestMoveXRange(this.body, other.flipH, this.body.width/2);
            this.forceMoveTo(this.flipH, x);
            if (isUpdatePowerMeter) {
                other.updatePowerMeter(1);
            }
        },

        followPlayer: function() {
            var flipSide = this.getFlipSideTowardsPlayer();
            this.flip(flipSide);
            this.targetXToFollow = this._root.player.body.centerX;
            this.activeBehaviourState = flipSide === FLIP_H_SIDE.RIGHT.side ? BEHAVIOUR_STATES.FOLLOW_PLAYER_RIGHT : BEHAVIOUR_STATES.FOLLOW_PLAYER_LEFT;
            if (this.body.x <= this._root.background.wall1.centerX) {
                this.ignoreWallNameForCollision = "wall1";
            } else
            if (this.body.x >= this._root.background.wall2.centerX) {
                this.ignoreWallNameForCollision = "wall2";
            }
        },

        autoDetectChoices: function() {
            if (this.isDead) { return; }
            if (this.isTakeDamage || this._root.player.isDead) {
                this.choiceStand();
                return;
            }
            var choice = this.getArrayRandomValue(CHOICES);
            this.ignoreWallNameForCollision = "";

            this.killTimeout("stand");
            switch(choice) {
                case ENEMY_CHOICES_TYPE.STAND:
                    this.choiceStand();
                    break;
                case ENEMY_CHOICES_TYPE.ATTACK:
                    this.choiceAttack();
                    break;
                case ENEMY_CHOICES_TYPE.RUN_AWAY:
                    if (this.forceChoice !== BEHAVIOUR_STATES.NONE) { return; }
                    this.choiceRunAway();
                    break;
            } 
        },

        choiceStand: function(duration) {
            duration = duration !== undefined ? duration : 2000;
            this.killTimeout("stand");
            this.activeBehaviourState = BEHAVIOUR_STATES.STAND;
            this.timeouts.stand = setTimeout(function() {
                this.vsPlayer();
            }.bind(this), duration);
        },

        choiceAttack: function() {
            if (this.isAllowAttack) {
                this.activeBehaviourState = BEHAVIOUR_STATES.ATTACK;
                var flipSide = this.getFlipSideTowardsPlayer();

                this.flip(flipSide);
                this.attack("punch");
            } else {
                this.vsPlayer();
            }
        },

        choiceRunAway: function() {
            if (this.body.x <= this._root.background.wall1.centerX) {
                this.runAwayTowardsWallType(2, "wall1");
            } else
            if (this.body.x >= this._root.background.wall2.centerX) {
                this.runAwayTowardsWallType(1, "wall2");
            } else {
                if (this.isBehindPlayer()) {
                    this.runAwayTowardsWallType(2)
                } else {
                    this.runAwayTowardsWallType(1);
                }
            }
        },

        runAwayTowardsWallType: function(wallType, ignoreWallName) {
            this.ignoreWallNameForCollision = ignoreWallName || "";
            switch(wallType) {
                case 1:
                    this.flip(FLIP_H_SIDE.LEFT.side);
                    this.targetXToFollow = this._root.background.wall1.centerX;
                    this.activeBehaviourState = BEHAVIOUR_STATES.FOLLOW_PLAYER_LEFT;
                    break;
                case 2:
                    this.flip(FLIP_H_SIDE.RIGHT.side);
                    this.targetXToFollow = this._root.background.wall2.centerX;
                    this.activeBehaviourState = BEHAVIOUR_STATES.FOLLOW_PLAYER_RIGHT;
                    break;
            }
        },

        isWithinTargetRange: function(target1, target2, range) {
            target1 = target1 !== undefined ? target1 : this.body;
            target2 = target2 !== undefined ? target2 : this._root.player.body;
            range = range || 20;
            var distance = this.g.distance(target1, target2); 
            return Boolean(distance <= range);
        },

        isBehindPlayer: function() {
            return Boolean(this.body.x <= this._root.player.body.x);
        },
        
        isSeenByPlayer: function() {
            return Boolean(
                (this.body.x <= this._root.player.body.x && this._root.player.isFlipH()) ||
                (this.body.x >= this._root.player.body.x && !this._root.player.isFlipH())
            );
        },

        getFlipSideTowardsPlayer: function() {
            return this.isBehindPlayer() ? FLIP_H_SIDE.RIGHT.side : FLIP_H_SIDE.LEFT.side;
        },

        onSkinAnimationComplete: function() {
            switch(this.playState) {
                case "punch":
                    this.onCompleteAttack(300, this.choiceStand.bind(this));
                    break;
                case "hurt":
                    this.isTakeDamage = false;
                    this.choiceStand();
                    break;
                case "die":
                    this.destroy();
                    break;
            }
        },

        middlewareOnCompleteAttack: function() {
            this.checkAttackHitToPlayer();
        },

        middlewareOnKill: function() {
            this._root.incrementEnemiesKilled();
        },

		forceKill: function() {
			this.receiveDamage(this.health);
		},

        destroy: function() {
            this.timeouts.kill = setTimeout(function() {
                this.stopUpdate();
                this.showSkinBody(false);
            }.bind(this), 1000);
        }

    });
}
