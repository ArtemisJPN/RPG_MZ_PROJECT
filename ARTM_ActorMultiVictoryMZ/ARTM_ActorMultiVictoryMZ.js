// ===================================================
// ARTM_ActorMultiVictoryMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// ===================================================
// [Version]
// 1.0.0 初版
// 1.1.0 戦闘不能アクターも勝利モーションになる不具合を修正
//       大規模なリファクタリングを実施
// 1.1.1 勝利モーション開始直後の周期遅延を修正
// 1.1.2 負荷軽減のためリファクタリングを実施
// 1.1.3 デフォルトモーション画像のリジュームが遅延する不具合を修正
// 1.2.0 プラグイン軽量化のため需要性が低いグループ機能を廃止
// =================================================================
/*:ja
 * @target MZ
 * @plugindesc バトル勝利時の勝利ポーズを変更可能にするMZ専用プラグイン
 * @author Artemis
 *
 * @help ARTM_ActorMultiVictoryMZ.js
 *
 * バトル勝利時の勝利ポーズを、詠唱ポーズ、眠りポーズ、武器素振りなど
 * ゲーム内で使用されている他のポーズに変更可能すること可能です。
 * また、勝利2回→素振り1回→眠りポーズ など、ポーズ切替も可能です。
 *
 *-------------------------------------------------
 * 各アクターのメモ欄タグは以下の通りです。
 *-------------------------------------------------
 * ■基本設定
 * <AMV_MTYPE:1つ目のモーション設定,2つ目のモーション設定,…>
 * モーション設定は以下の記述方式です。
 *
 *  モーション名^オプション1#オプション2,ループ数
 *
 *  モーション名：既存の'walk'～'dead'
 *  オプション1 ：指定は任意。（次項のオプションを参照）
 *  オプション2 ：指定は任意。（次項のオプションを参照）
 *  ループ数    ：１つの動作モーションを繰り返す回数
 *
 * ～使用例1～
 * ・勝利2回、素振り1回、のあとに眠りポーズを繰り返す場合
 *   <AMV_MTYPE:victory,2,swing,1,sleep,0>
 *
 * 【補足事項】
 *   モーション名については同梱の「Help_Motions.PNG」をご参照下さい。
 *
 * ■オプション
 * ・オプション1は以下の記述方式です。
 *  ^サイズ  ※2～6の整数
 *
 * ・オプション2は以下の記述方式です。
 *  #画像名
 *
 * ～使用例3～
 * ・画像"SF_Actor1_1"に切り替えて勝利を無限ループする場合
 *   <AMV_MTYPE:victory#SF_Actor1_1,0>
 *
 * ～使用例4～
 * ・画像"SF_Actor1_1"に切り替えてwalk～chantの3x3を
 *   1モーション(逆走なし）行い、既存の勝利を無限ループする場合
 *   <AMV_MTYPE:walk^3#SF_Actor1_1,1>
 *
 * プラグインコマンドはありません。
 *
 */
 
(() => {

    const PLG_NAME = "ARTM_ActorMultiVictoryMZ";
    const TAG_NAME = "AMV_MTYPE";
    const PARAMS = PluginManager.parameters(PLG_NAME);
    const MOTIONS = Object.keys(Sprite_Actor.MOTIONS);
    let VALUES = "";
    MOTIONS.forEach(m => VALUES += m + "|");
    VALUES = VALUES.slice(0, -1).replace("\"", "");

    //-----------------------------------------------------------------------------
    // function
    //
    function makeParams(params) {
        const result = [];
        regexp = new RegExp("^((?:" + VALUES + ").*,[0-9]+,)+$", "g");
        if (regexp.test(params + ",")) {
            const args = params.split(",");
            for (let i = 0; i < args.length; i++) {
                if (i % 2 !== 0) { continue; }
                result.push({
                    "type": args[i],
                    "loop": +(args[i + 1] || "0")
                });
            }
        }
        return result;
    }

    function getTagParams(object) {
        const params = object.actor().meta;
        return (
            params[TAG_NAME] ? 
            makeParams(params[TAG_NAME]) :
            undefined
        );
    }

    function getMultiVictMode(actor) {
        return actor._motionInfoAMV ? 0 : -1;
    }

    function getMotion(actor) {
        return MOTIONS[actor._resizeIdxAMV];
    }

    function getMotionObj(actor) {
        return Sprite_Actor.MOTIONS[getMotion(actor)];
    }

    function getMotionLMC(actor) {
        return actor._motionCInfoAMV[actor._motionCIndexAMV];
    }

    function getCountLM(actor) {
        return actor._loopCountAMV;
    }

    function checkMSW(actor, state, sign) {
        if (sign < 0) {
            return actor._mainswAMV <= state;
        } else if (sign >0) {
            return actor._mainswAMV >= state;
        } else {
            return actor._mainswAMV === state;
        }
    }

    function checkPatternLim(sprite) {
        return sprite._pattern < sprite._actor._patternPreAMV;
    }

    function updateMSW(actor, state) {
        actor._mainswAMV = state;
    }

    function checkSwing(actor) {
        return getMotion(actor) === "swing" ? 1 : 0;
    }

    function checkSignLM(actor, sign) {
        return Math.sign(actor._loopCountAMV) === sign;
    }

    function clearClsMembers(actor) {
        actor._motionInfoAMV = undefined;
        actor._motionCInfoAMV = undefined;
        actor._motionCIndexAMV = undefined;
        actor._loopCountAMV = undefined;
        actor._patternPreAMV = undefined;
        actor._battlerNameAMV = undefined;
        actor._battlerName = actor._battlerNameDefAMV;
        actor._battlerNameDefAMV = undefined;
        actor._sizeInfMaxAMV = undefined;
        actor._sizeInfAMV = undefined;
        actor._resizeIdxAMV = undefined;
        actor._mainswAMV = undefined;
    }

    //-----------------------------------------------------------------------------
    // Game_Actor
    //
    const _Game_Actor_performVictory = Game_Actor.prototype.performVictory;
    Game_Actor.prototype.performVictory = function() {
        _Game_Actor_performVictory.call(this);
        const paramss = getTagParams(this);
        if (!this.canMove() || !paramss) return;
        this._motionInfoAMV = paramss;
        const paramsTmp = PARAMS[paramss.type] || paramss[0];
        this.requestMotion(paramsTmp.type);
        this._loopCountAMV = 0;
        this._patternPreAMV = 4;
        this._mainswAMV = 1;
    };

    //-----------------------------------------------------------------------------
    // Game_Party
    //
    const _Game_Party_performVictory = Game_Party.prototype.performVictory;
    Game_Party.prototype.performVictory = function() {
        _Game_Party_performVictory.call(this);
        const motions = Sprite_Actor.MOTIONS;
        const scene = SceneManager._scene;
        for (key in motions) {
            if (!motions[key].loop) {
                motions[key].loop = true;
                scene._stackTypAMV.push(key);
            }
        }
    };

    //-----------------------------------------------------------------------------
    // Sprite_Actor
    //
    Sprite_Actor.prototype.changeMotionAMV = function(typeI) {
        const typeT = this.changeMotionResizeAMV(typeI);
        const typeO = this.changeMotionImageAMV(typeT);
        const motion = Sprite_Actor.MOTIONS[typeO];
        if (motion) {
            this._actor._resizeIdxAMV = motion.index;
        } else {
            this._actor._resizeIdxAMV = undefined;
        }
        return typeO;
    };

    Sprite_Actor.prototype.changeMotionResizeAMV = function(type) {
        const sizeInf1 = type.split("^");
        if (sizeInf1.length === 2) {
            const sizeInf2 = sizeInf1[1].split("#");
            const size = Number(sizeInf2[0]);
            if (size > 1 && size <= 6) {
                this._actor._sizeInfMaxAMV = size;
                this._actor._sizeInfAMV = size;
                updateMSW(this._actor, 3);
            }
            if (sizeInf2.length !== 2) return sizeInf1[0];
            return sizeInf1[0] + "#" + sizeInf2[1];
        }
        return type;
    };

    Sprite_Actor.prototype.changeMotionImageAMV = function(type) {
        const nameDef = this._actor._battlerNameDefAMV;
        const imageInf = type.split("#");
        if (imageInf.length === 2) {
            this._actor._battlerNameAMV = imageInf[1];
            return imageInf[0];
        }
        if (this._actor._battlerName !== nameDef) {
            this._actor._battlerName = nameDef;
        }
        return type;
    };

    Sprite_Actor.prototype.selectMotionTypeAMV = function(type, loop) {
        const sldType = this.changeMotionAMV(type);
        this._actor.requestMotion(sldType)
        this._actor._loopCountAMV = loop > 0 ? loop : -1;
    };

    Sprite_Actor.prototype.selectActorImageAMV = function() {
        if (this._actor._battlerNameAMV) {
            this._actor._battlerName = this._actor._battlerNameAMV;
            this._actor._battlerNameAMV = undefined;
        }
    };

    Sprite_Actor.prototype.isResizeImageAMV = function() {
        return (
            getMultiVictMode(this._actor) !== -1 &&
            this._actor._sizeInfAMV > 0
        );
    };

    const _Sprite_Actor_updateFrame = Sprite_Actor.prototype.updateFrame;
    Sprite_Actor.prototype.updateFrame = function() {
        if (checkMSW(this._actor, 2, 1)) {
            this.updateFrameEntrAMV();
        } else if (checkMSW(this._actor, 1, 0)) {
            this._pattern = 0;
            updateMSW(this._actor, 2) ;
        }
        _Sprite_Actor_updateFrame.call(this);
    };

    Sprite_Actor.prototype.updateFrameEntrAMV = function() {
        const pattern = this._pattern;
        const mode = getMultiVictMode(this._actor);
        if (mode === 0) {
            this.updateFrameNormalAMV();
        }
    };

    Sprite_Actor.prototype.updateFrameNormalAMV = function() {
        const motionInfo = this._actor._motionInfoAMV;
        if (checkMSW(this._actor, 2, 0) && checkPatternLim(this)) {
             if (motionInfo[0] !== "") {
                 this.updateFrameNormalProcAMV();
             } else if (checkSignLM(this._actor, 1)) {
                 this.refreshWeaponAMV(getCountLM(this._actor));
                 this._actor._loopCountAMV--;
             } else if (checkSignLM(this._actor, -1)) {
                 this.refreshWeaponAMV(1);
             } else {
                 this.updateMotionDefAMV();
             }
        }
        this._actor._patternPreAMV = this._pattern;
    };

    Sprite_Actor.prototype.updateFrameNormalProcAMV = function() {
        const motionInfo = this._actor._motionInfoAMV;
        if (checkSignLM(this._actor, 0)) { 
            const motion = motionInfo.shift();
            this.selectMotionTypeAMV(motion.type, motion.loop);
            this.selectActorImageAMV();
            if (motionInfo.length === 0) {
                this._actor._motionInfoAMV = [""];
            }
            this.refreshWeaponAMV(checkSwing(this._actor));
            if (!this._actor._motionCInfoAMV) {
                this._actor._loopCountAMV--;
            }
        } else {
            this._actor._loopCountAMV--;
            this.refreshWeaponAMV(getCountLM(this._actor) + 1);
        }
    };

    Sprite_Actor.prototype.refreshWeaponAMV = function(count) {
        if (getMotion(this._actor) === "swing" && count > 0) {
            this._actor.performAttack();
        }
    };

    const _Sprite_Actor_updateMotionCount = Sprite_Actor.prototype.updateMotionCount;
    Sprite_Actor.prototype.updateMotionCount = function() {
        if (this.isResizeImageAMV()) {
            this.updateMotionCountEntr();
        } else {
            _Sprite_Actor_updateMotionCount.call(this);
        }
    };

    Sprite_Actor.prototype.updateMotionCountEntr = function() {
        if (this._motion && ++this._motionCount >= this.motionSpeed()) {
            this.updateMotionCountAMV(2);
            this._pattern = (this._pattern + 1) % 3
            this._motionCount = 0;
        }
    };

    Sprite_Actor.prototype.updateMotionCountAMV = function(base) {
        if (this._pattern === base) {
            const index = this._actor._resizeIdxAMV;
            const next = --this._actor._sizeInfAMV === 0;
            if (!next) {
                this._actor._resizeIdxAMV = Math.min(index + 1, 17);
                this._motion = getMotionObj(this._actor);
            } else {
                this.updateMotionCountProcAMV();
                this._motion = getMotionObj(this._actor);
            }
        }
    };

    Sprite_Actor.prototype.updateMotionCountProcAMV = function() {
        if (getMultiVictMode(this._actor) === 0) {
            this.updateMotionCountNProcAMV();
        }
    };

    Sprite_Actor.prototype.updateMotionCountNProcAMV = function() {
        const index = this._actor._motionCIndexAMV;
        this._actor._loopCountAMV--;
        if (checkSignLM(this._actor, -1)) {
            if (this._actor._motionInfoAMV.length === 0) {
                this.updateMotionDefAMV();
            }
            this._actor._patternPreAMV = 4;
            this._actor._loopCountAMV = 0;
            updateMSW(this._actor, 2);
        } else {
            this._actor._patternPreAMV = 4;
            this._actor._resizeIdxAMV = Math.max(index - 2, 0);
            this._actor._sizeInfAMV = this._actor._sizeInfMaxAMV;
            this._motion = getMotionObj(this._actor);
        }
    };

    Sprite_Actor.prototype.updateMotionDefAMV = function() {
        const typeI = "victory";
        const typeO = this.changeMotionAMV(typeI);
        this._actor.requestMotion(typeO);
        this._actor._motionInfoAMV = undefined;
        this._actor._sizeInfAMV = undefined;
        this.updateBitmap();
        this.setupMotion();
    };

    //-----------------------------------------------------------------------------
    // Scene_Battle
    //
    const _Scene_Battle_start = Scene_Battle.prototype.start;
    Scene_Battle.prototype.start = function() {
        _Scene_Battle_start.call(this);
        const members = $gameParty.battleMembers();
        const motions = Sprite_Actor.MOTIONS;
        this._stackTypAMV = [];
        for (const member of members) {
            member._battlerNameDefAMV = member._battlerName;
            updateMSW(member, 0);
        }
    };

    const _Scene_Battle_terminate = Scene_Battle.prototype.terminate;
    Scene_Battle.prototype.terminate = function() {
        const members = $gameParty.battleMembers();
        const motions = Sprite_Actor.MOTIONS;
        if (this._stackTypAMV) {
            this._stackTypAMV.forEach(v => motions[v].loop = false);
            this._stackTypAMV = undefined;
        }
        for (const member of members) {
            clearClsMembers(member);
        }
        _Scene_Battle_terminate.call(this);
    };

})();