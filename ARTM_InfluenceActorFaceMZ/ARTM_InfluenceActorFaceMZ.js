// ===================================================
// ARTM_InfluenceActorFaceMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// ===================================================
// [Version]
// 1.0.0 初版
// 1.0.1 カンマ区切り以外のメモデータがある際にエラーとなる不備を修正
// 1.0.2 優先高の顔画像が解除されると優先度低の顔画像が表示されない不備を修正
// 1.1.0 顔画像の事前ロード有無設定を追加, その他のパフォーマンス改善
// =================================================================
/*:ja
 * @target MZ
 * @plugindesc バトル中のフェイス画像を変更するMZ専用プラグイン
 * @author Artemis
 *
 * @help ARTM_InfluenceActorFaceMZ.js
 * バトル中、アクターの状態に基づきフェイス画像を変更します。
 * 以下3つのトリガーが使用できます。
 *       HP…アクターの現在HPが指定値以下になった時
 *       MP…アクターの現在MPが指定値以下になった時
 * ステート…アクターが指定値のステート状態になった時
 *
 *-------------------------------------------------
 * メモ欄タグは以下の通りです。
 *-------------------------------------------------
 * ★HPのトリガー
 * <IAF_HP:(HPの基準),(顔画像名),(顔画像インデックス)>
 *  ☆HP50%以下で"Actor4"顔画像の1番目を指定する場合
 *    <IAF_HP:50,Actor4,1>
 *
 * ★MPのトリガー
 * <IAF_MP:(MPの基準),(顔画像名),(顔画像インデックス)>
 *  ☆MP10%以下で"Actor4"顔画像の2番目を指定する場合
 *    <IAF_MP:10,Actor4,2>
 *
 * ★ステートのトリガー
 * <IAF_ST:(ステートID),(顔画像名),(顔画像インデックス)>
 *  ☆ステートID4の状態異常中は"Actor5"顔画像の7番目を指定する場合
 *    <IAF_ST:4,Actor5,7>
 *
 *-------------------------------------------------
 * 使用上のご注意
 *-------------------------------------------------
 * ★トリガー重複時の優先度について
 *   メモ欄の先頭行に近いほど優先度が高くなります。
 *   <IAF_HP:0,Monster,2>
 *   <IAF_ST:4,Monster,1>
 *   <IAF_HP:15,Monster,7>
 *   例として上の順で記述すると、優先度は以下のようになります。
 *   ・ステート4がON＋HP15%以下 → Monsterの1番目インデックス表示
 *   ・ステート4がON＋HP0       → Monsterの2番目インデックス表示
 *
 * プラグインコマンドはありません。
 *
 * @command setting
 *
 * @param preLoad
 * @type boolean
 * @on 有り
 * @off 無し
 * @default false
 * @text 顔画像の事前ロード
 * @desc 戦闘開始時に顔画像をすべて事前ロードします。
 *       顔画像切替時の表示ラグがある場合に有効です。
 *
 */
 
(() => {

    const _PREF = "IAF_";
    const TYPE = ["HP", "MP", "ST"].map(v => _PREF + v);
    const TGTYPE = {"HP":TYPE[0], "MP":TYPE[1], "ST":TYPE[2]};
    let Images = {};
    const _param = PluginManager.parameters("ARTM_InfluenceActorFaceMZ");
    // ver.1.1.0 顔画像の事前ロード有無設定を追加
    const IS_PRELOAD = (_param["preLoad"] || "false").toLowerCase() === "true";

    function getParamsByType(args) {
        if ([TGTYPE.HP, TGTYPE.MP].includes(args[4])) {
            args.push(Number(args[0] || "0") / 100);
        } else if ([TGTYPE.ST].includes(args[4])) {
            args.push(Number(args[0] || "0"));
        } else {
            return null;
        }
        return ({
            "key"  :args[3] + args[4] + args[6],
            "type" :args[4],
            "value":args[6],
            "name" :args[1],
            "index":Number(args[2] || "0"),
            "prior":args[5]
        }); 
    }

    const _DataManager_extractMetadata = DataManager.extractMetadata;
    DataManager.extractMetadata = function(data) {
        let idx = 0;
        let targets = "(";
        TYPE.forEach(v => targets += v + "|");
        targets = targets.substr(0, targets.length - 1) + ")";
        const regexp = new RegExp(targets, "g");
        data.note = data.note.replace(regexp, (v => {
            return v + ("00" + idx++).slice(-2);
        }));
        _DataManager_extractMetadata.call(this, data);
    };

    Game_Actor.prototype.getParamsWrapIAF = function() {
        const id = this.actorId();
        const meta = this.actor().meta;
        const paramsList = [];
        let prior = 0;
        for (const key in meta) {
            const type = key.slice(0, key.length - 2);
            const args = ("" + meta[key]).match(/^[0-9]+,[!-~]+,[0-9]+$/g);
            if (args) {
                const params = getParamsByType(
                    (args[0] + ',' + id + ',' + type + ',' + prior++).split(",")
                );
                paramsList.push(params);
            }
        }
        return paramsList.length > 0 ? paramsList : [{"value":null}];
    };

    Game_Actor.prototype.getFaceInfoFirstIAF = function() {
        const priorFirst =
            this._faceInfo.map(f => Number(f.prior)).sort((a, b) => a - b)[0];
        return this._faceInfo.filter(f => f.prior === "" + priorFirst)[0];
    };

    Game_Actor.prototype.existFaceImagesIAF = function() {
        return $gameParty.inBattle() ? this._faceInfo.length > 0 : false;
    };

    const _Game_Actor_initMembers = Game_Actor.prototype.initMembers;
    Game_Actor.prototype.initMembers = function() {
        _Game_Actor_initMembers.call(this);
        this._needsFaceChanging = false;
        this._faceInfo = [];
        this._faceInfoSave = [];
    };

    const _Game_Actor_faceName = Game_Actor.prototype.faceName;
    Game_Actor.prototype.faceName = function() {
        if (this.existFaceImagesIAF()) {
            return this.getFaceInfoFirstIAF().name;
        } else {
            return _Game_Actor_faceName.call(this);
        }
    };

    const _Game_Actor_faceIndex = Game_Actor.prototype.faceIndex;
    Game_Actor.prototype.faceIndex = function() {
        if (this.existFaceImagesIAF()) {
            return this.getFaceInfoFirstIAF().index - 1;
        } else {
            return _Game_Actor_faceIndex.call(this);
        }
    };

    function checkFaceChange(actor, params, match) {
        const stack = actor._faceInfo.some(v => v.key === params.key);
        if (match && !stack) {
            actor._faceInfo.push({
                "key"  :params.key,
                "type" :params.type,
                "name" :params.name,
                "index":params.index,
                "prior":params.prior
            });
        } else if (!match && stack) {
            actor._faceInfo = actor._faceInfo.filter(v => v.key !== params.key);
        } else {
            return false;
        }
        return true;
    }

    Game_Actor.prototype.checkFaceChangeIAF = function() {
        const paramsWrap = this.getParamsWrapIAF();
        let match, result;
        for (const params of paramsWrap) {
            match = this.checkThresholdIAF(params);
            result = checkFaceChange(this, params, match);
            if (!this._needsFaceChanging && result) {
                this._needsFaceChanging = true;
            }
        }
    };

    Game_Actor.prototype.checkThresholdIAF = function(params) {
        let match;
        if (params.type === TGTYPE.HP) {
            match = this.hp <= (this.mhp * params.value);
        } else if (params.type === TGTYPE.MP){
            match = this.mp <= (this.mmp * params.value);
        } else if (params.type === TGTYPE.ST){
            match = this.isStateAffected(params.value);
        } else {
            match = false;
        }
        return match;
    };

    const _Game_Battler_onTurnEnd = Game_Battler.prototype.onTurnEnd;
    Game_Battler.prototype.onTurnEnd = function() {
        _Game_Battler_onTurnEnd.call(this);
        if (this instanceof Game_Actor && $gameParty.inBattle()) {
            this.checkFaceChangeIAF();
            if (this._needsFaceChanging) {
                preparePartyRefresh(this);
            }
        }
    };

    const _BattleManager_invokeAction = BattleManager.invokeAction;
    BattleManager.invokeAction = function(subject, target) {
        const actor =
            target.isActor() ? target : subject.isActor() ? subject : null;
        _BattleManager_invokeAction.call(this, subject, target);
        if (actor) {
            actor.checkFaceChangeIAF();
            if (actor._needsFaceChanging) {
                preparePartyRefresh(actor);
            }
        }
    };

    const _Scene_Battle_start = Scene_Battle.prototype.start;
    Scene_Battle.prototype.start = function() {
        _Scene_Battle_start.call(this);
        // ver.1.1.0 顔画像の事前ロード有無設定を追加
        if (IS_PRELOAD) {
            for (const member of $gameParty.battleMembers()) {
                this.initFaceParamesIAF(member);
                member.checkFaceChangeIAF();
                preparePartyRefresh(member);
            }
        }
    };

    Scene_Battle.prototype.initFaceParamesIAF = function(actor) {
        const paramsWrap = actor.getParamsWrapIAF();
        const actorId = actor.actorId();
        let key = actor.faceName();
        Images[key] = ImageManager.loadFace(key);
        if (paramsWrap[0]) {
            for (const params of paramsWrap) {
                key = params.name;
                if (!(key in Images)) {
                    const name = params.name;
                    Images[key] = ImageManager.loadFace(name);
                }
            }
        }
    };

    const _Scene_Battle_terminate = Scene_Battle.prototype.terminate;
    Scene_Battle.prototype.terminate = function() {
        const members = $gameParty.battleMembers();
        members.forEach(member => member._faceInfo = []);
        Images = {};
        _Scene_Battle_terminate.call(this);
    };

    function preparePartyRefresh(actor) {
        if (!actor.result().isStatusAffected()) {
            preparePartyRefreshMain(actor);
        }
    }

    function preparePartyRefreshMain(actor) {
        const targets =
            [SceneManager._scene._statusWindow, SceneManager._scene._actorWindow];
        const key = actor.faceName();
        // ver.1.1.0 顔画像の事前ロード有無設定を追加
        const bitmap = IS_PRELOAD ? Images[key] : ImageManager.loadFace(key);
        const fnc = drawFaceCustom;
        bitmap.addLoadListener(fnc.bind(this, bitmap, actor, targets));
        actor._needsFaceChanging = false;
    }

    function drawFaceCustom(bitmap, actor, targets) {
        for (const target of targets) {
            drawFaceCustomMain(bitmap, actor, target);
        }
    }

    function drawFaceCustomMain(bitmap, actor, target) {
        const faceIndex = actor.faceIndex();
        const pw = ImageManager.faceWidth;
        const ph = ImageManager.faceHeight;
        const rect = target.faceRect(actor.index());
        const width = rect.width || ImageManager.faceWidth;
        const height = rect.height || ImageManager.faceHeight;
        const sw = Math.min(width, pw);
        const sh = Math.min(height, ph);
        const dx = Math.floor(rect.x + Math.max(width - pw, 0) / 2);
        const dy = Math.floor(rect.y + Math.max(height - ph, 0) / 2);
        const sx = (faceIndex % 4) * pw + (pw - sw) / 2;
        const sy = Math.floor(faceIndex / 4) * ph + (ph - sh) / 2;
        target.contents.clearRect(rect.x, rect.y, sw, sh);
        target.contents.blt(bitmap, sx, sy, sw, sh, dx, dy);
    }

    const _Sprite_Gauge_updateTargetValue = Sprite_Gauge.prototype.updateTargetValue
    Sprite_Gauge.prototype.updateTargetValue = function(value, maxValue) {
        _Sprite_Gauge_updateTargetValue.call(this, value, maxValue);
        if (
            $gameParty.inBattle() &&
            Object.keys(Images).length > 0 &&
            this._battler.isActor()
        ) {
            this._battler.checkFaceChangeIAF();
            if (this._battler._needsFaceChanging) {
                preparePartyRefresh(this._battler);
            }
        }
    };

    const _Sprite_StateIcon_updateIcon = Sprite_StateIcon.prototype.updateIcon;
    Sprite_StateIcon.prototype.updateIcon = function() {
        _Sprite_StateIcon_updateIcon.call(this);
        if (
            $gameParty.inBattle() && 
            this._battler.isActor() &&
            this._battler._needsFaceChanging
        ) {
            preparePartyRefreshMain(this._battler);
        }
    };

})();