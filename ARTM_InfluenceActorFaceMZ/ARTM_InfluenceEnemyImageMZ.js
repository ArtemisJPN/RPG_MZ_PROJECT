// ===================================================
// ARTM_InfluenceEnemyImageMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// ===================================================
// [Version]
// 1.0.0 初版
// 1.0.1 カンマ区切り以外のメモデータがある際にエラーとなる不備を修正
// =================================================================
/*:ja
 * @target MZ
 * @plugindesc バトル中の敵画像をステート状態により変更するMZ専用プラグイン
 * @author Artemis
 *
 * @help ARTM_InfluenceEnemyImageMZ
 *
 * バトル中の敵画像をステート状態により変更するMZ専用プラグインです。
 *
 *-------------------------------------------------
 * 敵キャラのメモ欄タグは以下の通りです。
 *-------------------------------------------------
 * <IEI_STID:(ステートID),(敵画像名)>
 *
 * ～使用例～
 *  ステートID0004で"Harpy"画像を指定、
 *  ステートID0006で"Medusa"画像を指定、
 *    <IEI_STID:4,Harpy>
 *    <IEI_STID:6,Medusa>
 *
 * ステートが複数重なった場合、記述順に優先されます。
 * 上記の例でステート4,6の状態になった場合はID0004の画像が優先して表示され、
 * ステート4が解除されるとステート6の画像に変わります。
 * （すべて解除されると元の画像に戻ります。）
 *
 * プラグインコマンドはありません。
 *
 */
 
(() => {

    const PREF = "IEI_STID";

    function makeParams(args) {
        args[0] = Number(args[0] || "0");
        return ({
            "key"  :args[2] + args[0],
            "value":args[0],
            "name" :args[1],
            "prior":args[3]
        }); 
    }

    const _DataManager_extractMetadata = DataManager.extractMetadata;
    DataManager.extractMetadata = function(data) {
        let idx = 0;
        let targets = "(" + PREF + ")";
        const regexp = new RegExp(targets, "g");
        data.note = data.note.replace(regexp, (v => {
            return v + ("00" + idx++).slice(-2);
        }));
        _DataManager_extractMetadata.call(this, data);
    };

    Game_Enemy.prototype.getParamsWrap_Artm = function() {
        const meta = this.enemy().meta;
        const paramsList = [];
        const id = [this.enemyId() + ""];
        let prior = 0;
        for (const key in meta) {
            const args = ("" + meta[key]).match(/^[0-9]+,[!-~]+$/g);
            if (args) {
                const params = makeParams(
                    (args[0] + ',' + id + ',' + prior++).split(",")
                );
                paramsList.push(params);
                prior++;
            }
        }
        return (
            paramsList.length > 0 ?
            paramsList : [{"value":null}]
        );
    };

    Game_Enemy.prototype.getPicInfoFirst_Artm = function() {
        const priorFirst =
            this._infoArtm.map(f => Number(f.prior)).sort((a, b) => a - b)[0];
        return this._infoArtm.filter(f => f.prior === "" + priorFirst)[0];
    };

    Game_Enemy.prototype.existKeys_Artm = function() {
        return $gameParty.inBattle() ? this._infoArtm.length > 0 : false;
    };

    const _Game_Enemy_initMembers = Game_Enemy.prototype.initMembers;
    Game_Enemy.prototype.initMembers = function() {
        _Game_Enemy_initMembers.call(this);
        this._needsFaceChanging = false;
        this._infoArtm = [];
    };

    const _Game_Enemy_battlerName = Game_Enemy.prototype.battlerName;
    Game_Enemy.prototype.battlerName = function() {
        if (this.existKeys_Artm()) {
            return this.getPicInfoFirst_Artm().name;
        } else {
            return _Game_Enemy_battlerName.call(this);
        }
    };

    Game_Enemy.prototype.checkThresholdMain_Artm = function(params, match) {
        const stack = this._infoArtm.some(v => v.key === params.key);
        if (match && !stack) {
            this._infoArtm.push({
                "key"  :params.key,
                "name" :params.name,
                "prior":params.prior
            });
        } else if (!match && stack) {
            this._infoArtm = this._infoArtm.filter(v => {
                return v.key !== params.key;
            });
        } else {
            return false;
        }
        return true;
    };

    Game_Enemy.prototype.checkFaceChange_Artm = function() {
        const paramsWrap = this.getParamsWrap_Artm();
        let match, result;
        for (const params of paramsWrap) {
            match = this.checkThreshold_Artm(params);
            result = this.checkThresholdMain_Artm(params, match);
            if (!this._needsFaceChanging && result) {
                this._needsFaceChanging = true;
            }
        }
    };

    Game_Enemy.prototype.checkThreshold_Artm = function(params) {
        return this.isStateAffected(params.value);
    };

    Game_Enemy.prototype.changeEnemyImage_Artm = function() {
        this._battlerName = this.battlerName();
    };

    const _Scene_Battle_terminate = Scene_Battle.prototype.terminate;
    Scene_Battle.prototype.terminate = function() {
        const members = $gameTroop.members();
        members.forEach(member => member._infoArtm = []);
        _Scene_Battle_terminate.call(this);
    };

    const _Sprite_Enemy_loadBitmap = Sprite_Enemy.prototype.loadBitmap;
    Sprite_Enemy.prototype.loadBitmap = function(name) {
        if (
            !this._enemy.existKeys_Artm() ||
            this._enemy._needsFaceChanging
        ) {
            _Sprite_Enemy_loadBitmap.call(this, name);
        }
    };

    const _Sprite_Enemy_initVisibility = Sprite_Enemy.prototype.initVisibility;
    Sprite_Enemy.prototype.initVisibility = function() {
        if (this._enemy._needsFaceChanging) {
            this._enemy._needsFaceChanging = false;
        } else {
            _Sprite_Enemy_initVisibility.call(this);
        }
    };

    const _Sprite_StateIcon_updateIcon = Sprite_StateIcon.prototype.updateIcon;
    Sprite_StateIcon.prototype.updateIcon = function() {
        const battler = this._battler;
        _Sprite_StateIcon_updateIcon.call(this);
        if (
            $gameParty.inBattle() &&
            battler.isEnemy() &&
            battler.isAlive()
        ) {
            battler.checkFaceChange_Artm();
            if (battler._needsFaceChanging) {
                battler.changeEnemyImage_Artm();
            }
        }
    };

})();