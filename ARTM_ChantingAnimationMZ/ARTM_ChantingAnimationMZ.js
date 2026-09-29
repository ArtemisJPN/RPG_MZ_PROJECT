// ===================================================
// ARTM_ChantingAnimationMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// =============================================================================
// [Version]
// 1.7.0 ケケー様作「Keke_SpeedStarBattle」との競合対応
// 1.6.4 詠唱中に沈黙状態となったとき、詠唱アニメーションが表示される不具合を修正
// 1.6.3 詠唱アニメーションのレイヤー設定オプション(前面/背面)を追加
// 1.6.1 通常攻撃と防御の行動を中断シーン対象から除外
// 1.6.0 フェードイン用の詠唱アニメーション表示機能を追加
// 1.5.2 終了フレームの指定に不具合があったため修正
// 1.5.1 マップシーンでも本プラグインが稼働していた不具合を修正
// 1.5.0 終了フレームの指定機能を追加（アニメーション間の途切れ防止）
// 1.3.1 詠唱アニメーション継続OFF設定時、イベント発生中も中断するよう対応
// 1.3.0 アクションフェーズ時の詠唱アニメーション継続ON/OFFを追加
//       詠唱完了後もアニメーションのフラッシュ色が残り続ける不具合を解消
// 1.1.0 魔法以外のスキルタイプにも対応
// 1.0.0 初版
// =============================================================================
/*:ja
 * @target MZ
 * @plugindesc 指定IDのアニメーションを詠唱者にループ表示するMZ専用プラグイン
 * @author Artemis
 *
 * @help ARTM_ChantingAnimationMZ.js
 * アクターやエネミーのスキル詠唱中に、
 * 詠唱者へ指定IDのアニメーションをループ表示するMZ専用プラグインです。
 *
 *--------------
 * ご使用方法
 *--------------
 *
 * ■メモ欄の設定について
 * 　対象スキルのメモ欄に値をセットして下さい。
 *
 *【書式】
 * 　詠唱アニメーションをループ再生する場合
 * 　　<CA_INFO:ID(ID),ED_FRAME(終了フレーム),(レイヤー)>
 * 　　・(ID)にはアニメーションIDを指定します。
 * 　　・(レイヤー)には前面表示："f"or"F"、背面表示："b"or"B"を指定します。
 *
 * 　フェードイン入りの詠唱アニメーションをループ再生する場合
 * 　　<CA_INFO:ID(ID);(ID),ED_FRAME(終了フレーム);(終了フレーム),(レイヤー)>
 * 　　・(ID)にはアニメーションIDを指定します。
 * 　　・(レイヤー)には前面表示："f"or"F"、背面表示："b"or"B"を指定します。
 *
 * 【記載例】
 * 　ID：0050のアニメーション(120フレーム※)を前面表示でループ再生する場合
 * 　　<CA_INFO:ID50,ED_FRAME120,f>
 *
 * 　ID：0010のアニメーション(30フレーム)をフェードイン用(1回)として、
 * 　ID：0050のアニメーション(120フレーム※)をループ用として、
 * 　それぞれ背面表示で再生する場合
 * 　　<CA_INFO:ID10;50,ED_FRAME30;120,b>
 *
 * 　開始フレームが0より大きい場合は、
 * 　Effekseerツールで生成開始時間を負値にして下さい。
 * 　例として、開始フレーム2/終了フレーム120 の場合は、
 * 　生成開始時間に-2を設定してアニメーションを再保存して下さい。
 * 
 * 　上記を実施してもループ間がぶつ切りする場合は、
 * 　ED_FRAMEの値を調整して下さい。
 * 
 * ■プラグインパラメータについて
 * 　詠唱アニメーション継続設定
 * 　   ON:中断シーン※でも詠唱アニメーションを継続します。
 * 　  OFF:中断シーン※では詠唱アニメーションを中断します。
 *
 * 　　※中断シーンとは、イベント発生中や攻撃中を指します。
 *
 * プラグインコマンドはありません。
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

    Game_Temp.prototype.excludSkill_Artm = function() {
        const action = BattleManager._action;
        if (action) {
            return(
                (action.isAttack() || action.isGuard()) ?
                "" : "action"
            );
        }
        return "";
    };

    Game_Temp.prototype.currentExecutingAction_Artm = function() {
        if (BattleManager._action) {
            return BattleManager._action;
        }
        if (BattleManager._actionKeSpsb) {
            return BattleManager._actionKeSpsb;
        }
        return null;
    };

    Game_Temp.prototype.isSkillInterrupting_Artm = function() {
        const action = this.currentExecutingAction_Artm();
        if (!action) {
            return false;
        }
        if (action.isAttack() || action.isGuard()) {
            return false;
        }
        if (BattleManager._phase === "action") {
            return true;
        }
        if (BattleManager._battleWaitKe > 0 || BattleManager._subjectKeSpsb) {
            return true;
        }
        const inPopWait = [...$gameParty.aliveMembers(), ...$gameTroop.aliveMembers()]
            .some(b => b._inPopWaitKe);
        if (inPopWait) {
            return true;
        }
        return false;
    };

    Game_Temp.prototype.isKeepAnimation_Artm = function(battler) {
        if (!battler.isCasting_Artm()) {
            return false;
        }
        if (BattleManager._phase === "battleEnd" || BattleManager._phase === "") {
            return false;
        }
        if (!KeepAnime) { 
            if (
                SceneManager.isSceneChanging() ||
                $gameTroop.isEventRunning()
            ) { 
                return false; 
            }
            if (this.isSkillInterrupting_Artm()) {
                return false;
            }
        }
        return true;
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
        this._tpbStatePrevArtm = null;
    };

    Game_BattlerBase.prototype.animationPlaying_Artm = function() {
        return this._animationPlayingArtm;
    };

    Game_BattlerBase.prototype.startAnimation_Artm = function() {
        this._animationPlayingArtm = true;
    };

    Game_BattlerBase.prototype.endAnimation_Artm = function() {
        this._animationPlayingArtm = false;
        if (
            this._tpbState !== "casting" &&
            (this.itemSaveArtm ?? [0])[0] === null
        ) {
            this.itemSaveArtm = undefined;
        }
    };

    Game_BattlerBase.prototype.initAnimationPitch_Artm = function(speed) {
        this._animationPitchArtm = parseInt(120 / (speed / 100)) * 1.5;
    };

    Game_BattlerBase.prototype.animationPitch_Artm = function() {
        return this._animationPitchArtm;
    };

    Game_BattlerBase.prototype.isCasting_Artm = function() {
        if (BattleManager.isTpb()) {
            return this._tpbState === "casting";
        }
        if (BattleManager.isInTurn() && this.currentAction()) {
            const item = this.currentAction().item();
            return item && item.speed < 0;
        }
        return false;
    };

    Game_BattlerBase.prototype.isChantingActive_Artm = function() {
        if (
            !this.isCasting_Artm() ||
            this.itemSaveArtm?.[1]
        ) { return false; }
        return $gameTemp.isKeepAnimation_Artm(this);
    };

    //-----------------------------------------------------------------------------
    // Game_Battler
    //
    const _Game_Battler_addState = Game_Battler.prototype.addState;
    Game_Battler.prototype.addState = function(stateId) {
        _Game_Battler_addState.call(this, stateId);
        const item = this.itemSaveArtm ?? [null, null];
        if (item[0] && this.isSkillTypeSealed(item[0].stypeId)) {
            this.itemSaveArtm[1] = true;
        }
    };

    const _Game_Battler_removeState = Game_Battler.prototype.removeState;
    Game_Battler.prototype.removeState = function(stateId) {
        _Game_Battler_removeState.call(this, stateId);
        const item = this.itemSaveArtm ?? [null, null];
        if (item[0] && !this.isSkillTypeSealed(item[0].stypeId)) {
            this.itemSaveArtm = [null, false];
        }
        this.updateTpbStetePre_Artm(true);
    };

    const _Game_Battler_tpbAcceleration = Game_Battler.prototype.tpbAcceleration;
    Game_Battler.prototype.tpbAcceleration = function() {
        if ($gameParty.inBattle() && SceneManager._scene instanceof Scene_Battle) {
            const anyoneChanting = [...$gameParty.battleMembers(), ...$gameTroop.members()]
                .some(b => b.isAlive() && b.isCasting_Artm());
            if (anyoneChanting && typeof keke_timeAutoFast !== "undefined") {
                const speed = this.tpbSpeed();
                const baseRate = this.isActor() ? 1 : this.tpbRelativeSpeed();
                return speed * baseRate * (typeof timeSpeed === "function" ? timeSpeed() : 1);
            }
        }
        return _Game_Battler_tpbAcceleration.call(this);
    };

    Game_Battler.prototype.updateTpbStetePre_Artm = function(flag) {
        if (flag) {
            this._tpbStatePrevArtm = "waiting";
        }
    };

    //-----------------------------------------------------------------------------
    // Sprite_Battler
    //
    const _Sprite_Battler_initMembers = Sprite_Battler.prototype.initMembers;
    Sprite_Battler.prototype.initMembers = function() {
        _Sprite_Battler_initMembers.call(this);
        this._chantInfoArtm = null;
    };

    Sprite_Battler.prototype.canChantAnime_Artm = function() {
        const battler = this._battler;
        return (
            battler.isChantingActive_Artm() && 
            battler._tpbStatePrevArtm !== "casting"
        );
    };

    Sprite_Battler.prototype.updateChantInfo_Artm = function() {
        const item = this._battler.action(0)?._item;
        const param = item?.isSkill() ? item.object().meta[TAG_NAME] : null;
        if (!param) {
            this._chantInfoArtm = null;
            return;
        }
        const m = /^ID(\d+)(?:;(\d+))?\s*,\s*ED_FRAME(\d+)(?:;(\d+))?\s*,\s*([fb])$/i.exec(param);
        if (m) {
            const ids = m[2] ? [+m[1], +m[2]] : [+m[1]];
            const frames = m[4] ? [+m[3] + 1, +m[4] + 1] : [+m[3] + 1];
            this._chantInfoArtm = [ids, frames, m[5].toLowerCase()];
        } else {
            this._chantInfoArtm = null;
        }
    };

    Sprite_Battler.prototype.chantInfo_Artm = function() {
        const info = this._chantInfoArtm;
        return info ? [info[0][0], info[1][0], info[2]] : [-1];
    };

    Sprite_Battler.prototype.nextChantInfo_Artm = function() {
        if (this._chantInfoArtm[0].length > 1) {
            this._chantInfoArtm[0].shift();
            this._chantInfoArtm[1].shift();
        }
        return this.chantInfo_Artm();
    };

    Sprite_Battler.prototype.updateAnimation_Artm = function() {
        if (this.canChantAnime_Artm()) {
            this.updateChantInfo_Artm();
            this.requestAnimation_Artm();
        }
        if ($gameTemp.isKeepAnimation_Artm(this._battler)) {
            this._battler._tpbStatePrevArtm = this._battler._tpbState;
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
            if (speed < 0) {
                $gameTemp.requestAnimation_Artm(this, animationId);
            }
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
        this._isChantingAnimeArtm = true;
        this._animeSpeedKe = 1;
    };

    Sprite_Animation_Artm.prototype.spriteBase = function() {
        return this._spriteBase;
    };

    Sprite_Animation_Artm.prototype.updateEffectGeometry = function() {
        const scale = this._animation.scale / 100;
        if (this._handle) {
            this._handle.setLocation(this.x, this.y, 0);
            this._handle.setRotation(this.rotation * (180 / Math.PI), 0, 0);
            this._handle.setScale(scale, scale, scale);
            this._handle.setSpeed(this._animation.speed / 100);
        }
    };

    Sprite_Animation_Artm.prototype.processFlashTimings = function() {
        for (const timing of this._animation.flashTimings) {
            if (timing.frame === this._frameIndex) {
                this._flashDuration = timing.duration;
                this._flashColor = timing.color.clone();
            }
        }
    };

    Sprite_Animation_Artm.prototype.processSoundTimings = function() {
        for (const timing of this._animation.soundTimings) {
            if (timing.frame === this._frameIndex) {
                AudioManager.playSe(timing.se);
            }
        }
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
        const animation = { ...$dataAnimations[request.animationId] };
        const targets = request.targets;
        const mirror = request.mirror;
        targets[0].itemSaveArtm = [targets[0]._actions[0].item(), false];
        this.createAnimationSprite_Artm(sprite, targets, animation, mirror);
    };

    Spriteset_Battle.prototype.createAnimationSprite_Artm = function(
        sprite, targets, animation, mirror
    ) {
        const spriteAnimation = new Sprite_Animation_Artm(sprite);
        const targetSprites = this.makeTargetSprites(targets);
        if (this.animationShouldMirror(targets[0])) { mirror = !mirror; }
        spriteAnimation.targetObjects = targets;
        spriteAnimation.setup(targetSprites, animation, mirror, 0, null);
        spriteAnimation._animation.displayType = -1;
        targets[0].initAnimationPitch_Artm(spriteAnimation._animation.speed);
        if (sprite.chantInfo_Artm()[2] === "b") {
            this._effectsContainer.addChildAt(spriteAnimation, 0);
        } else {
            this._effectsContainer.addChild(spriteAnimation);
        }
        spriteAnimation._animeSpeedKe = 1;
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
            const animationId = spriteBase.nextChantInfo_Artm()[0];
            this._queueArtm.push([spriteBase, animationId]);
        }
    };

    Spriteset_Battle.prototype.checkEnd_Artm = function(sprite) {
        const spriteBase = sprite.spriteBase();
        const battler = spriteBase._battler;
        const endFrame = spriteBase.chantInfo_Artm()[1];
        const isActive = battler.isChantingActive_Artm();
        const isEnded = !sprite.isPlaying();
        const isReachLoopPoint = (endFrame === -1) 
            ? isEnded 
            : (sprite._frameIndex >= endFrame && !sprite._hasQueuedNextArtm);
        if (isReachLoopPoint) sprite._hasQueuedNextArtm = true;
        battler.updateTpbStetePre_Artm(!isActive);
        return {
            shouldRemove: !isActive || isEnded,
            shouldQueueNext: isActive && isReachLoopPoint
        };
    };

    Spriteset_Battle.prototype.updateAnimations_Artm = function() {
        for (const sprite of [...this._animationSpritesArtm]) {
            const result = this.checkEnd_Artm(sprite);
            const spriteBase = sprite.spriteBase();
            const battler = spriteBase._battler;
            const isActive = battler && battler.isChantingActive_Artm();
            if (result.shouldRemove) {
                this.removeAnimation_Artm(sprite);
                if (result.shouldQueueNext) {
                    this.insertQueue_Artm(sprite);
                }
            } 
            else if (!isActive) {
                sprite.visible = false;
            } 
            else {
                sprite.visible = true;
                if (result.shouldQueueNext) {
                    this.insertQueue_Artm(sprite);
                }
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
        if (typeof sprite.stop === "function") sprite.stop();
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