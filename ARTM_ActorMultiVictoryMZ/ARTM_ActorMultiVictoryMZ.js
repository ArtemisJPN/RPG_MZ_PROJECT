// ===================================================
// ARTM_ActorMultiVictoryMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// ===================================================
// [Version]
// 1.4.0 条件ごとにモーションを変更できる機能を追加
// 1.3.0 オプション2有効時に、表示スピードを変更できる機能を追加
// 1.2.2 1つ目のモーションで画像変更オプションが効かない不具合を修正
// 1.2.1 パフォーマンス改善
//       画像変更後に自動で元画像へ戻らないよう仕様変更
// 1.2.0 プラグイン軽量化のため需要性が低いグループ機能を廃止
// 1.1.3 デフォルトモーション画像のリジュームが遅延する不具合を修正
// 1.1.2 負荷軽減のためリファクタリングを実施
// 1.1.1 勝利モーション開始直後の周期遅延を修正
// 1.1.0 戦闘不能アクターも勝利モーションになる不具合を修正
//       大規模なリファクタリングを実施
// 1.0.0 初版
// =================================================================
/*:ja
 * @target MZ
 * @plugindesc バトル勝利時の勝利モーションを変更可能にするMZ専用プラグイン
 * @author Artemis
 *
 * @help ARTM_ActorMultiVictoryMZ.js
 *
 * バトル勝利時の勝利モーションを、詠唱、眠り、武器素振りなど
 * ゲーム内で使用されている他のモーションに変更することができます。
 * また、勝利2回→素振り1回→眠り など、回数指定も可能です。
 *
 *-------------------------------------------------
 * 各アクターのメモ欄タグは以下の通りです。
 *-------------------------------------------------
 * ■基本設定
 * <AMV_MTYPE:1つ目のモーション設定,2つ目のモーション設定,…>
 * モーション設定は以下の記述方式です。
 *
 *  モーション名^オプション2#オプション1,ループ回数;オプション3;
 *
 *  モーション名：既存の'walk'～'dead'
 *  オプション1 ：指定は任意。（次項のオプションを参照）
 *  オプション2 ：指定は任意。（次項のオプションを参照）
 *  　　　　　 　 ※オプション2は、オプション1の指定が必須です。
 *  ループ回数  ：１つの動作モーションを繰り返す回数。
 *  　　　　　 　 最後のモーションのループ回数には、必ず'0'を指定して下さい。
 *  オプション3 ：指定は任意。（次項のオプションを参照）
 *  　　　　　 　 ※オプション3は、オプション2の指定が必須です。
 *
 *  <AMV_MTYPE_SWn:ここはAMV_MTYPEと同じ設定を記載する>
 *  ・SW0001がONの時に限定する場合
 *    <AMV_MTYPE_SW1:abnormal,0>
 *
 *  <AMV_MTYPE_STn:ここはAMV_MTYPEと同じ設定を記載する>
 *  ・ステート5の状態時に限定する場合
 *    <AMV_MTYPE_ST5:abnormal,0>
 *
 *  <AMV_MTYPE_HPn:ここはAMV_MTYPEと同じ設定を記載する>
 *  ・HP25%以下に限定する場合
 *    <AMV_MTYPE_HP25:abnormal,0>
 *
 * ～使用例１～
 * ・勝利2回、素振り1回、のあとに眠りを繰り返す場合
 *   <AMV_MTYPE:victory,2,swing,1,sleep,0>
 *
 * 【補足事項】
 *   モーション名については同梱の「Help_Motions.PNG」をご参照下さい。
 *
 * ■オプション
 * ・オプション1は以下の記述方式です。
 *  #画像名
 *
 * ～使用例２～
 * ・画像"SF_Actor1_1"に切り替える場合
 *   <AMV_MTYPE:victory#SF_Actor1_1,0>
 *
 * ・オプション2は以下の記述方式です。
 *  ^サイズ  ※2～6の整数
 *
 * ～使用例３～
 * ・画像"SF_Actor1_1"に切り替えてwalk～chantの3x3=9枚の画像を
 *   一方通行で1周表示する場合
 *   <AMV_MTYPE:walk^3#SF_Actor1_1,1>
 *
 * ・オプション3は以下の記述方式です。
 *  1枚目の表示時間;2枚目の表示時間;3枚目の表示時間; …(枚数分の繰り返し）
 *
 * ～使用例４～
 * ・使用例３を徐々に早く表示するために、
 * 　スピード値を、12→11→ … →5→4 と変化させる場合
 *   <AMV_MTYPE:walk^3#SF_Actor1_1,1;12;11;10;9;8;7;6;5;4>
 *
 * プラグインコマンドはありません。
 *
 */
 
(() => {

    const STACK_WK = [];
    const TAG_BASE  = "AMV_MTYPE";
    const DLMTR = {"size": "^", "image": "#"};
    const MOTIONS = Object.keys(Sprite_Actor.MOTIONS);
    const VALUES = MOTIONS.join("|");

    //-----------------------------------------------------------------------------
    // regexp patterns
    //-----------------------------------------------------------------------------
    const REGEXP_PATTERNS = [
        "^((?:" + VALUES + ").*,[0-9]+(?:;[0-9]+)*,)+$",
        "^([^\\" + DLMTR.size + "]+)\\" + DLMTR.size +
            "([0-9]+)" + DLMTR.image + "(.+)$",
        "^(?:\\d{1,2};).+$"
    ];

    //-----------------------------------------------------------------------------
    // function
    //-----------------------------------------------------------------------------
    function getParams(obj) {
        const meta = obj.actor().meta;
        const swKey = _findSwitchParamKey(meta);
        if (swKey) {
            return _makeParams(meta[swKey]);
        }
        const stateKey = _findStateParamKey(obj, meta);
        if (stateKey) {
            return _makeParams(meta[stateKey]);
        }
        const hpKey = _findHpParamKey(obj, meta);
        if (hpKey) {
            return _makeParams(meta[hpKey]);
        }
        return meta[TAG_BASE] ? _makeParams(meta[TAG_BASE]) : [];
    }

    function _findSwitchParamKey(meta) {
        const matches = [];
        for (const key in meta) {
            const match = key.match(/^AMV_MTYPE_SW(\d+)$/);
            if (match) {
                const swId = Number(match[1]);
                if ($gameSwitches.value(swId)) {
                    matches.push({ id: swId, key: key });
                }
            }
        }
        if (matches.length === 0) { return null; }
        matches.sort((a, b) => a.id - b.id);
        return matches[0].key;
    }

    function _findStateParamKey(obj, meta) {
        for (const key in meta) {
            const match = key.match(/^AMV_MTYPE_ST(\d+)$/);
            if (match && obj.isStateAffected(Number(match[1]))) {
                return key;
            }
        }
        return null;
    }

    function _findHpParamKey(obj, meta) {
        const matches = [];
        for (const key in meta) {
            const match = key.match(/^AMV_MTYPE_HP(\d+)$/);
            if (match) {
                const threshold = Number(match[1]);
                const maxAllowedHp = Math.ceil(obj.mhp * (threshold / 100));
                if (obj.hp <= maxAllowedHp) {
                    matches.push({ rate: threshold, key: key });
                }
            }
        }
        if (matches.length === 0) { return null; }
        matches.sort((a, b) => a.rate - b.rate);
        return matches[0].key;
    }

    function getAllParamsForPreload(obj) {
        const meta = obj.actor().meta;
        let allParams = [];
        if (meta[TAG_BASE]) {
            allParams = allParams.concat(_makeParams(meta[TAG_BASE]));
        }
        for (const key in meta) {
            if (/^AMV_MTYPE_(?:SW|HP|ST)\d+$/.test(key)) {
                allParams = allParams.concat(_makeParams(meta[key]));
            }
        }
        return allParams;
    }

    function _makeParams(params) {
        const result = [];
        const regexp = new RegExp(REGEXP_PATTERNS[0]);
        if (regexp.test(params + ",")) {
            const args = params.split(",");
            for (let i = 0; i < args.length; i++) {
                if (i % 2 !== 0) { continue; }
                result.push(_makeParam(args, i));
            }
        }
        return result;
    }

    function _makeParam(args, index) {
        const regexp = new RegExp(REGEXP_PATTERNS[2]);
        const match = regexp.exec(args[index + 1]);
        let loop = args[index + 1];
        let speed = null;
        if (match) {
            const split = match[0].split(";");
            loop = split.shift();
            speed = split.map(Number);
        }
        return ({
            "type": args[index],
            "loop": +loop,
            "speed": speed
        });
    }

    //-----------------------------------------------------------------------------
    // Game_Party
    //-----------------------------------------------------------------------------
    const _Game_Party_performVictory = Game_Party.prototype.performVictory;
    Game_Party.prototype.performVictory = function() {
        _Game_Party_performVictory.call(this);
        const motions = Sprite_Actor.MOTIONS;
        for (const key in motions) {
            if (!motions[key].loop) {
                motions[key].loop = true;
                STACK_WK.push(key);
            }
        }
    };

    //-----------------------------------------------------------------------------
    // Game_Battler
    //-----------------------------------------------------------------------------
    const _Game_Battler_onBattleEnd = Game_Battler.prototype.onBattleEnd;
    Game_Battler.prototype.onBattleEnd = function() {
        if (this instanceof Game_Actor) {
            this._motionsArtm = undefined;
            this.nextPhase_Artm("none");
        }
        _Game_Battler_onBattleEnd.call(this);
    };

    //-----------------------------------------------------------------------------
    // Game_Actor
    //-----------------------------------------------------------------------------
    const _Game_Actor_initMembers = Game_Actor.prototype.initMembers;
    Game_Actor.prototype.initMembers = function() {
        _Game_Actor_initMembers.call(this);
        this._phaseArtm = "none";
    };

    const _Game_Actor_setup = Game_Actor.prototype.setup;
    Game_Actor.prototype.setup = function(actorId) {
        _Game_Actor_setup.call(this, actorId);
    };

    Game_Actor.prototype.setParams_Artm = function(params) {
        this._motionsArtm = {
            "motions": [...params],
            "count": 0,
            "pattern": 4
        };        
    };

    const _Game_Actor_performVictory = Game_Actor.prototype.performVictory;
    Game_Actor.prototype.performVictory = function() {
        _Game_Actor_performVictory.call(this);
        const params = getParams(this);
        if (this.canMove() && params.length > 0) {
            this.requestMotion(params[0].type);
            this.setParams_Artm(params);       
            this.nextPhase_Artm("starting");
        }
    };

    Game_Actor.prototype.nextPhase_Artm = function(state) {
        this._phaseArtm = state;
    };

    //-----------------------------------------------------------------------------
    // Sprite_Actor
    //-----------------------------------------------------------------------------
    const _Sprite_Actor_initMembers = Sprite_Actor.prototype.initMembers;
    Sprite_Actor.prototype.initMembers = function() {
        _Sprite_Actor_initMembers.call(this);
        this._sizeCountArtm = 0;
        this._sizeCountMaxArtm = 0;
        this._indexArtm = -1;
        this._motionsArtm = null;
        this._bitmapsArtm = {};
    };

    const _Sprite_Actor_setBattler = Sprite_Actor.prototype.setBattler;
    Sprite_Actor.prototype.setBattler = function(battler) {
        const battlerOld = this._actor;
        _Sprite_Actor_setBattler.call(this, battler);
        if (battler && battler !== battlerOld) {
           for (const param of getAllParamsForPreload(battler)) {
                this.setBitmaps_Artm(param.type);
            }
        }
    };

    Sprite_Actor.prototype.setBitmaps_Artm = function(tag) {
        if (tag.indexOf(DLMTR.image) !== -1) {
            const name = tag.split(DLMTR.image)[1];
            if (!this._bitmapsArtm[name]) {
                this._bitmapsArtm[name] = ImageManager.loadSvActor(name);
            }
        }
    };

    const _Sprite_Actor_updateFrame = Sprite_Actor.prototype.updateFrame;
    Sprite_Actor.prototype.updateFrame = function() {
        switch (this.phase_Artm()) {
            case "starting":
                this._pattern = 0;
                this._motionsArtm = this._actor._motionsArtm;
                this._actor.nextPhase_Artm("processing");
                if (this.existMotion_Artm()) {
                    break;
                }
                // falls through
            case "processing":
                this.updateFrame_Artm();
                this._motionsArtm.pattern = this._pattern;
                break;
            case "changing":
                this._motionsArtm.pattern = this._pattern;
                break;
        }
        _Sprite_Actor_updateFrame.call(this);
    };

    Sprite_Actor.prototype.updateFrame_Artm = function() {
        if (this._pattern < this._motionsArtm.pattern) {
            if (this._motionsArtm.motions.length > 0) {
                this.refreshMotion_Artm();
            } else if (this.isMotionEnd(1)) {
                this.refreshWeapon_Artm(this._motionsArtm.count);
                this._motionsArtm.count--;
            }
            this.refreshWeapon_Artm();
        }
    };

    Sprite_Actor.prototype.refreshMotion_Artm = function() {
        if (this.isMotionEnd(0)) {
            const motions = this._motionsArtm.motions;
            const motion = motions.shift();
            this.setMotionType_Artm(motion);
            this.refreshWeapon_Artm();
            this._motionsArtm.count--;
        } else {
            this._motionsArtm.count--;
            this.refreshWeapon_Artm(this._motionsArtm.count + 1);
        }
    };

    Sprite_Actor.prototype.refreshWeapon_Artm = function(count = 1) {
        if (this.checkSwing_Artm() && count > 0) {
            this._actor.performAttack();
        }
    };

    const _Sprite_Actor_updateMotionCount = Sprite_Actor.prototype.updateMotionCount;
    Sprite_Actor.prototype.updateMotionCount = function() {
        if (!this.checkResize_Artm()) {
            _Sprite_Actor_updateMotionCount.call(this);
            return
        }
        if (++this._motionCount >= this.motionSpeed_Artm()) {
            if (this._pattern === 2) {
                if (this.checkSizeEnd_Artm()) {
                    this.updateMotionCountLooping_Artm();
                } else if (this.existMotions_Artm()) {
                    this.updateMotionCountLooped_Artm();
                }
            }
            this._pattern = (this._pattern + 1) % 3
            this._motionCount = 0;
        }
    };

    Sprite_Actor.prototype.updateMotionCountLooping_Artm = function() {
        this._indexArtm = Math.min(this._indexArtm + 1, 17);
        this._motion = this.motion_Artm();
    };

    Sprite_Actor.prototype.updateMotionCountLooped_Artm = function() {
        this._motionsArtm.count--;
        if (this.isMotionEnd(-1)) {
            this._motionsArtm.pattern = 4;
            this._motionsArtm.count = 0;
            this._actor.nextPhase_Artm("processing");
        } else {
            this._motionsArtm.pattern = 4;
            this._indexArtm = 0;
            this._sizeCountArtm = this._sizeCountMaxArtm;
        }
        this._motion = this.motion_Artm();
    };

    Sprite_Actor.prototype.changeMotion_Artm = function(typeI) {
        const typeT = this.changeMotionResize_Artm(typeI);
        const typeO = this.changeMotionImage_Artm(typeT);
        const motion = Sprite_Actor.MOTIONS[typeO];
        this._indexArtm = motion ? motion.index : -1;
        return typeO;
    };

    Sprite_Actor.prototype.changeMotionImage_Artm = function(type) {
        const imageInfo = type.split(DLMTR.image);
        const bitmap = this._bitmapsArtm[imageInfo[1]];
        if (imageInfo[1]) {
            if (this._mainSprite.bitmap !== bitmap) {
                this._mainSprite.bitmap = bitmap;
                this.setupMotionCount_Artm(imageInfo[0]);
            }
            return imageInfo[0];
        }
        return type;
    };

    Sprite_Actor.prototype.changeMotionResize_Artm = function(type) {
        const pattern = REGEXP_PATTERNS[1];
        const regexp = new RegExp(pattern);
        const match = regexp.exec(type);
        if (match) {
            if (+match[2] === (+match[2]).clamp(2, 6)) {
                this._sizeCountArtm = +match[2];
                this._sizeCountMaxArtm = +match[2];
                this._actor.nextPhase_Artm("changing");
            }
            return match[1] + DLMTR.image + match[3];
        }
        return type;
    };

    Sprite_Actor.prototype.isMotionEnd = function(sign) {
        return Math.sign(this._motionsArtm.count) === sign;
    };

    Sprite_Actor.prototype.checkResize_Artm = function() {
        return this.existMotions_Artm() && this._sizeCountArtm > 0;
    };

    Sprite_Actor.prototype.checkSizeEnd_Artm = function() {
        return --this._sizeCountArtm > 0;
    };

    Sprite_Actor.prototype.checkSwing_Artm = function() {
        return this.motionName_Artm() === "swing";
    };

    Sprite_Actor.prototype.existMotion_Artm = function() {
        return MOTIONS[this._motionsArtm?.motions[0]?.type];
    };

    Sprite_Actor.prototype.existMotions_Artm = function() {
        return !!this._motionsArtm?.motions && this._motion;
    };

    Sprite_Actor.prototype.motionName_Artm = function() {
        return MOTIONS[this._indexArtm];
    };

    Sprite_Actor.prototype.motion_Artm = function() {
        return Sprite_Actor.MOTIONS[this.motionName_Artm()];
    };

    Sprite_Actor.prototype.motionSpeed_Artm = function() {
        const motionSpeed = this.motionSpeed();
        if (this._motionsArtm.speed) {
            const times = this._indexArtm * 3;
            const index = times + this._pattern;
            return this._motionsArtm.speed[index] ?? motionSpeed;
        }
        return motionSpeed;
    };

    Sprite_Actor.prototype.phase_Artm = function() {
        const phase = this._actor._phaseArtm;
        return (
            ["processing", "changing"].includes(phase) ?
            (this.existMotions_Artm() ? phase : "") : phase
        );
    };

    Sprite_Actor.prototype.setMotionType_Artm = function(motion) {
        const request = this.changeMotion_Artm(motion.type);
        const loop = motion.loop;
        this._actor.requestMotion(request)
        this._motionsArtm.count = loop > 0 ? loop : -1;
        this._motionsArtm.speed = motion.speed;
    };

    Sprite_Actor.prototype.setupMotionCount_Artm = function(type) {
        this._indexArtm = MOTIONS.indexOf(type);
        this._motion = this.motion_Artm();
    };

    //-----------------------------------------------------------------------------
    // Scene_Battle
    //-----------------------------------------------------------------------------
    const _Scene_Battle_terminate = Scene_Battle.prototype.terminate;
    Scene_Battle.prototype.terminate = function() {
        const motions = Sprite_Actor.MOTIONS;
        if (STACK_WK.length > 0) {
            STACK_WK.forEach(v => motions[v].loop = false);
            STACK_WK.length = 0;
        }
        _Scene_Battle_terminate.call(this);
    };

})();