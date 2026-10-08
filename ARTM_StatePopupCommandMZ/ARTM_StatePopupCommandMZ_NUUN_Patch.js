// *****************************************************
// ARTM_StatePopupCommandMZ_NUUN_Patch.js
// Copyright (c) 2026 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// ***********************************************************************
// ver.1.00: 初版
// ***********************************************************************
/*:ja
 * @target MZ
 * @plugindesc ARTM_StatePopupCommandMZ - NUUN_BattleStyleEX 併用パッチ
 * @author Artemis
 * @base ARTM_StatePopupCommandMZ
 * @base NUUN_BattleStyleEX_Base
 * @orderAfter ARTM_StatePopupCommandMZ
 * @orderAfter NUUN_BattleStyleEX_Base
 * 
 * @help
 * ARTM_StatePopupCommandMZ と NUUN_BattleStyleEX_Base の
 * 併用時に発生する以下の問題を修正します。
 * 
 * ・ステートポップアップ起動時にコマンドウィンドウが残ってしまう問題
 * ・ステート画面や対象選択画面の背景にアクターのステータスや
 *   グラフィックが透過・残存してしまう問題
 * ・ショートカットキー押下時に画面が固まる（レイヤー背面に潜り込む）問題
 * 
 * 【プラグインの配置順】
 * 1. NUUN_BattleStyleEX
 * 2. NUUN_BattleStyleEX_Base
 * 3. ARTM_StatePopupCommandMZ
 * 4. ARTM_StatePopupCommandMZ_NUUN_Patch（本プラグイン）
 */

(() => {

    Scene_Battle.prototype.setNuunStatusVisible_ArtmPatch = function(visible) {
        if (this._statusWindow) this._statusWindow.visible = visible;
        if (this._actorImges) this._actorImges.visible = visible;
        if (this._actorStatus) this._actorStatus.visible = visible;
    };

    const _Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        _Scene_Battle_createAllWindows.call(this);
        const artmWindows = [
            this._targetWindowArtm,
            this._stateListWindowArtm,
            this._stateDetailWindowArtm,
            this._stateNameWindowArtm
        ];

        for (const win of artmWindows) {
            if (win && win.parent) {
                const parent = win.parent;
                parent.removeChild(win);
                parent.addChild(win);
            }
        }
    };

    const _Scene_Battle_commandStatePopup_Artm = Scene_Battle.prototype.commandStatePopup_Artm;
    Scene_Battle.prototype.commandStatePopup_Artm = function() {
        if (this._actorCommandWindow) {
            this._actorCommandWindow.deactivate();
            this._actorCommandWindow.hide();
        }
        if (this._partyCommandWindow) {
            this._partyCommandWindow.deactivate();
            this._partyCommandWindow.hide();
        }
        _Scene_Battle_commandStatePopup_Artm.call(this);
    };

    const _Scene_Battle_startTargetSelection_Artm = Scene_Battle.prototype.startTargetSelection_Artm;
    Scene_Battle.prototype.startTargetSelection_Artm = function() {
        if (this._actorCommandWindow) this._actorCommandWindow.hide();
        if (this._partyCommandWindow) this._partyCommandWindow.hide();

        _Scene_Battle_startTargetSelection_Artm.call(this);

        if (!$dataSystem.optSideView) {
            const params = PluginManager.parameters("ARTM_StatePopupCommandMZ");
            const isOpacityBt = params.is_opacity_bt?.toLowerCase() === "true";
            if (!isOpacityBt) {
                this.setNuunStatusVisible_ArtmPatch(false);
            }
        }
    };

    const _Scene_Battle_onTargetOk_Artm = Scene_Battle.prototype.onTargetOk_Artm;
    Scene_Battle.prototype.onTargetOk_Artm = function() {
        _Scene_Battle_onTargetOk_Artm.call(this);

        const params = PluginManager.parameters("ARTM_StatePopupCommandMZ");
        const isOpacitySt = params.is_opacity_st?.toLowerCase() === "true";
        this.setNuunStatusVisible_ArtmPatch(isOpacitySt);
    };

    const _Scene_Battle_onTargetCancel_Artm = Scene_Battle.prototype.onTargetCancel_Artm;
    Scene_Battle.prototype.onTargetCancel_Artm = function() {
        _Scene_Battle_onTargetCancel_Artm.call(this);
        this.setNuunStatusVisible_ArtmPatch(true);
        if (this._commandWindowArtm) {
            this._commandWindowArtm.show();
            this._commandWindowArtm.activate();
        }
    };

    const _Scene_Battle_onStateCancel_Artm = Scene_Battle.prototype.onStateCancel_Artm;
    Scene_Battle.prototype.onStateCancel_Artm = function() {
        _Scene_Battle_onStateCancel_Artm.call(this);

        if ($dataSystem.optSideView) {
            this.setNuunStatusVisible_ArtmPatch(true);
            if (this._commandWindowArtm) {
                this._commandWindowArtm.show();
                this._commandWindowArtm.activate();
            }
        } else {
            const params = PluginManager.parameters("ARTM_StatePopupCommandMZ");
            const isOpacityBt = params.is_opacity_bt?.toLowerCase() === "true";
            this.setNuunStatusVisible_ArtmPatch(isOpacityBt);
            if (this._commandWindowArtm) {
                this._commandWindowArtm.hide();
                this._commandWindowArtm.deactivate();
            }
        }
    };

    const _Scene_Battle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        _Scene_Battle_update.call(this);
        const isTargetActive = Boolean(this._targetWindowArtm && this._targetWindowArtm.visible);
        const isStateActive = Boolean(this._stateListWindowArtm && this._stateListWindowArtm.visible);
        if (isTargetActive || isStateActive) {
            if (this._actorCommandWindow && this._actorCommandWindow.visible) {
                this._actorCommandWindow.hide();
            }
            if (this._partyCommandWindow && this._partyCommandWindow.visible) {
                this._partyCommandWindow.hide();
            }
            const params = PluginManager.parameters("ARTM_StatePopupCommandMZ");
            const isOpacityBt = params.is_opacity_bt?.toLowerCase() === "true";
            const isOpacitySt = params.is_opacity_st?.toLowerCase() === "true";
            if (isTargetActive && !isOpacityBt) {
                this.setNuunStatusVisible_ArtmPatch(false);
            } else if (isStateActive && !isOpacitySt) {
                this.setNuunStatusVisible_ArtmPatch(false);
            }
        }
    };
})();