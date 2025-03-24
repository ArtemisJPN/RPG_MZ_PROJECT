// ===================================================
// ARTM_ChantingAnimationMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// =============================================================================
// [Version]
// 1.0.0 初版
// 1.1.0 魔法以外のスキルタイプにも対応
// 1.3.0 アクションフェーズ時の詠唱アニメーション継続ON/OFFを追加
//       詠唱完了後もアニメーションのフラッシュ色が残り続ける不具合を解消
// 1.3.1 詠唱アニメーション継続OFF設定時、イベント発生中も中断するよう対応
// 1.5.0 終了フレームの指定機能を追加（アニメーション間の途切れ防止）
// 1.5.1 マップシーンでも本プラグインが稼働していた不具合を修正
// 1.5.2 終了フレームの指定に不具合があったため修正
// =============================================================================
/*:ja
 * @target MZ
 * @plugindesc 指定IDのアニメーションを詠唱者に表示するMZ専用プラグイン
 * @author Artemis
 *
 * @help ARTM_ChantingAnimationMZ.js
 * アクターやエネミーがスキル詠唱中、
 * その詠唱者に指定IDのアニメーションを表示し続けるMZ専用プラグインです。
 *
 *--------------
 * ご使用方法
 *--------------
 *
 * ■メモ欄の設定について
 * 対象スキルのメモ欄に値をセットして下さい。
 *
 *【書式】
 * 　<CA_INFO:ID(アニメーションID),ED_FRAME(終了フレーム)>
 *
 * 　【記載例】
 * 　　ID：0050のアニメーション(120フレーム※)を途切れなくループ再生する場合
 * 　　　<CA_INFO:ID50,ED_FRAME120>
 *
 * 　　※開始フレームが0より大きい場合は、
 * 　　　Effekseerツールで生成開始時間を負値にして下さい。
 * 　　　例として、開始フレーム2/終了フレーム120 の場合は、
 * 　　　生成開始時間に-2を設定してアニメーションを再保存して下さい。
 * 
 * 　　　上記を実施してもループ間がぶつ切りする場合は、
 * 　　　ED_FRAMEの値を調整して下さい。
 * 
 * ■プラグインパラメータについて
 * 詠唱アニメーション継続設定
 *    ON:中断シーンでも詠唱アニメーションを継続します。
 *   OFF:中断シーンでは詠唱アニメーションを中断します。
 * 　（中断シーンとは、イベント発生中や攻撃中を指します。）
 *
 * プラグインコマンドはありません。
 *
 * @param keepAnime
 * @text 詠唱アニメ継続設定
 * @desc 中断シーンでのアニメーション継続/中断を設定します。
 * 中断シーンとは、イベント発生中や攻撃中を指します。
 * @type boolean
 * @on 継続
 * @off 中断（デフォルト）
 * @default false
 */
 
(() => {

    const PLG_NAME = "ARTM_ChantingAnimationMZ";
    const TAG_NAME = "CA_INFO";
    const params = PluginManager.parameters(PLG_NAME);
    const KeepAnime = (params["keepAnime"] || "false").toLowerCase() === "true";

    //-----------------------------------------------------------------------------
    // Game_Temp
    //
    const _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this._animationQueueArtm = [];
    };

    Game_Temp.prototype.requestAnimation_Artm = function(sprite, animationId) {
        const target = sprite._battler;
        if ($dataAnimations[animationId]) {
            const request = {
                targets: [target],
                animationId: animationId,
                mirror: false,
                spriteBattler: sprite
            };
            this._animationQueueArtm.push(request);
            target.startAnimation_Artm();
        }
    };

    Game_Temp.prototype.retrieveAnimation_Artm = function() {
        return this._animationQueueArtm.shift();
    };

    Game_Temp.prototype.isKeepAnimation_Artm = function() {
        const targetPhase = ["battleEnd", ""];
        if (!KeepAnime) { 
            if (
                $gameTroop.isEventRunning() ||
                SceneManager.isSceneChanging()
            ) { return false; }
            targetPhase.push("action");
        }
        return !targetPhase.includes(BattleManager._phase);
    };


    //-----------------------------------------------------------------------------
    // Game_BattlerBase
    //
    const _Game_BattlerBase_initMembers = Game_BattlerBase.prototype.initMembers;
    Game_BattlerBase.prototype.initMembers = function() {
        _Game_BattlerBase_initMembers.call(this);
        this._animationPlayingArtm = false;
        this._animationCountArtm = 0;
        this._animationPitchArtm = 0;
    };

    Game_BattlerBase.prototype.animationPlaying_Artm = function() {
        return this._animationPlayingArtm;
    };

    Game_BattlerBase.prototype.startAnimation_Artm = function() {
        this._animationPlayingArtm = true;
    };

    Game_BattlerBase.prototype.endAnimation_Artm = function() {
        this._animationPlayingArtm = false;
    };

    Game_BattlerBase.prototype.initAnimationPitch_Artm = function(speed) {
        this._animationPitchArtm = parseInt(120 / (speed / 100)) * 1.5;
    };

    Game_BattlerBase.prototype.animationPitch_Artm = function() {
        return this._animationPitchArtm;
    };

    //-----------------------------------------------------------------------------
    // Sprite_Battler
    //
    const _Sprite_Battler_initMembers = Sprite_Battler.prototype.initMembers;
    Sprite_Battler.prototype.initMembers = function() {
        _Sprite_Battler_initMembers.call(this);
        this._chantInfoArtm = null;
        this._tpbStatePrevArtm = "";
    };

    Sprite_Battler.prototype.canChantAnime_Artm = function() {
        return (
            this._battler._tpbState === "casting" &&
            this._tpbStatePrevArtm !== "casting" &&
            $gameTemp.isKeepAnimation_Artm()
        );
    };

    Sprite_Battler.prototype.updateChantInfo_Artm = function() {
        const item = this._battler.action(0)?._item;
        if (item?.isSkill()) {
            const param = item.object().meta[TAG_NAME];
            const regexp = /^ID([0-9]+),ED_FRAME([0-9]+)$/g;
            const match = regexp.exec(param);
            if (match) {
                this._chantInfoArtm = [+match[1], ++match[2]];
                return;
            }
        }
        this._chantInfoArtm = [-1];
    };

    Sprite_Battler.prototype.chantInfo_Artm = function() {
        return this._chantInfoArtm;
    };

    Sprite_Battler.prototype.updateAnimation_Artm = function() {
        if (this.canChantAnime_Artm()) {
            this.updateChantInfo_Artm();
            this.requestAnimation_Artm();
        }
        if ($gameTemp.isKeepAnimation_Artm()) {
            this._tpbStatePrevArtm = this._battler._tpbState;
        }
    };

    Sprite_Battler.prototype.requestAnimation_Artm = function() {
        const animationId = this.chantInfo_Artm()[0];
        if (animationId > 0) { 
            let speed = 0;
            const battler = this._battler;
            if (battler.action(0)) {
                speed = battler.action(0).item().speed;
            }
            if (speed < 0 && !battler.animationPlaying_Artm()) {
                $gameTemp.requestAnimation_Artm(this, animationId);
            }
        }
    };

    Sprite_Battler.prototype.updateTpbStetePre_Artm = function(flag) {
        if (flag) {
            this._tpbStatePrevArtm = "waiting";
        }
    };

    //-----------------------------------------------------------------------------
    // Sprite_Actor
    //
    const _Sprite_Actor_updateMotion = Sprite_Actor.prototype.updateMotion;
    Sprite_Actor.prototype.updateMotion = function() {
        _Sprite_Actor_updateMotion.call(this);
        this.updateAnimation_Artm();
    };

    //-----------------------------------------------------------------------------
    // Sprite_Enemy
    //
    const _Sprite_Enemy_updateEffect = Sprite_Enemy.prototype.updateEffect;
    Sprite_Enemy.prototype.updateEffect = function() {
        _Sprite_Enemy_updateEffect.call(this);
        this.updateAnimation_Artm();
    };

    //-----------------------------------------------------------------------------
    // Sprite_Animation_Artm
    //
    function Sprite_Animation_Artm(spriteBase) {
        this.initialize(...arguments);
    }

    Sprite_Animation_Artm.prototype = Object.create(Sprite_Animation.prototype);
    Sprite_Animation_Artm.prototype.constructor = Sprite_Animation_Artm;

    Sprite_Animation_Artm.prototype.initialize = function(spriteBase) {
        Sprite_Animation.prototype.initialize.call(this);
        this._spriteBase = spriteBase;
    };

    Sprite_Animation_Artm.prototype.spriteBase = function() {
        return this._spriteBase;
    };

    //-----------------------------------------------------------------------------
    // Spriteset_Battle
    //
    const _Spriteset_Battle_initialize = Spriteset_Battle.prototype.initialize;
    Spriteset_Battle.prototype.initialize = function() {
        _Spriteset_Battle_initialize.call(this);
        this._animationSpritesArtm = [];
        this._queueArtm = [];
    };

    Spriteset_Battle.prototype.createAnimation_Artm = function(request) {
        const sprite = request.spriteBattler;
        const animation = $dataAnimations[request.animationId];
        const targets = request.targets;
        const mirror = request.mirror;
        this.createAnimationSprite_Artm(sprite, targets, animation, mirror);
    };

    Spriteset_Battle.prototype.createAnimationSprite_Artm = function(
        sprite, targets, animation, mirror
    ) {
        const spriteAnimation = new Sprite_Animation_Artm(sprite);
        const targetSprites = this.makeTargetSprites(targets);
        const baseDelay = this.animationBaseDelay();
        if (this.animationShouldMirror(targets[0])) { mirror = !mirror; }
        spriteAnimation.targetObjects = targets;
        spriteAnimation.setup(targetSprites, animation, mirror, 0, null);
        spriteAnimation._animation.displayType = -1;
        targets[0].initAnimationPitch_Artm(spriteAnimation._animation.speed);
        this._effectsContainer.addChild(spriteAnimation);
        this._animationSpritesArtm.push(spriteAnimation);
    };

    const _Spriteset_Battle_updateAnimations = Spriteset_Battle.prototype.updateAnimations;
    Spriteset_Battle.prototype.updateAnimations = function() {
        _Spriteset_Battle_updateAnimations.call(this);
        this._queueArtm = [];
        this.updateAnimations_Artm();
        this.processAnimationRequests_Artm();
    };

    Spriteset_Battle.prototype.insertQueue_Artm = function(sprite) {
        const spriteBase = sprite.spriteBase();
        const sprites = this._animationSpritesArtm;
        if (sprites.filter(s => s.spriteBase() === spriteBase).length < 2)
        {
            this._queueArtm.push([spriteBase, sprite._animation.id]);
        }
    };

    Spriteset_Battle.prototype.checkEnd_Artm = function(sprite) {
        const spriteBase = sprite.spriteBase();
        const endFrameIndex = spriteBase.chantInfo_Artm()[1];
        const flags = [
            !sprite.isPlaying(), false,
            sprite._frameIndex === endFrameIndex,
            spriteBase._battler._tpbState === "casting",
            endFrameIndex === -1,
        ];
        if (!$gameTemp.isKeepAnimation_Artm()) {
            spriteBase.updateTpbStetePre_Artm(flags[3]);
            flags[1] = true;
        }
        return flags;
    };

    Spriteset_Battle.prototype.updateAnimations_Artm = function() {
        for (const sprite of this._animationSpritesArtm) {
            const flags = this.checkEnd_Artm(sprite);
            if (flags[0] || flags[1]) {
                this.removeAnimation_Artm(sprite);
                if (flags[3] && flags[4]) {
                    this.insertQueue_Artm(sprite);
                }
            } else if (flags[3] && flags[2]) {
                this.insertQueue_Artm(sprite);
            }
        }
        for (const d of this._queueArtm) {
            $gameTemp.requestAnimation_Artm(d[0], d[1]);
        }
    };

    Spriteset_Battle.prototype.processAnimationRequests_Artm = function() {
        for (;;) {
            const request = $gameTemp.retrieveAnimation_Artm();
            if (request) {
                this.createAnimation_Artm(request);
            } else {
                break;
            }
        }
    };

    Spriteset_Battle.prototype.removeAnimation_Artm = function(sprite) {
        if (!sprite.isPlaying()) {
            sprite.spriteBase().setBlendColor([0, 0, 0, 0]);
        }
        this._animationSpritesArtm.remove(sprite);
        this._effectsContainer.removeChild(sprite);
        sprite.targetObjects[0].endAnimation_Artm();
        sprite.destroy();
    };

    //-----------------------------------------------------------------------------
    // BattleManager
    //
    const _BattleManager_startAction = BattleManager.startAction;
    BattleManager.startAction = function() {
        _BattleManager_startAction.call(this);
        const subject = this._subject;
        subject.endAnimation_Artm();
    };

})();