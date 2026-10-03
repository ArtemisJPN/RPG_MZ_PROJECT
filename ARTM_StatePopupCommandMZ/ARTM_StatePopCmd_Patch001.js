// *****************************************************
// ARTM_StatePopCmd_Patch001.js
// Copyright (c) 2025 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// *****************************************************
// ver.1.10: サイドビュー時の敵・味方切り替えボタン追加
// ver.1.01: ARTM_StatePopupCommandMZの更新に合わせ一部修正
// ver.1.00: 新規公開版
// *****************************************************
/*:ja
 * @target MZ
 * @plugindesc 外部プラグイン導入パッチ (Pseudo3DBattle連携)
 * @author Artemis
 * @base ARTM_StatePopupCommandMZ
 * @base MPP_Pseudo3DBattle
 * @orderAfter ARTM_StatePopupCommandMZ
 *
 * @help 木星ペンギン様作「MPP_Pseudo3DBattle.js」と併用する場合のパッチです。
 * ・ステート確認時の擬似3Dカメラ追従に対応します。
 * ・サイドビュー時、名前ウィンドウの右隣に敵・味方切り替え用ボタンを追加します。
 *
 */

(() => {

    const SWITCH_BUTTON_ICON_INDEX = 75;
    const BUTTON_SIZE = 48;
    const ICON_SCALE  = 1.2;

    // -----------------------------------------------------
    // Scene_Battle
    // -----------------------------------------------------
    const _Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        _Scene_Battle_createAllWindows.call(this);
        this.createStateSwitchButton_Artm();
    };

    Scene_Battle.prototype.createStateSwitchButton_Artm = function() {
        this._stateSwitchButtonArtm = new Sprite_StateSwitchButton_Artm(SWITCH_BUTTON_ICON_INDEX);
        this.addChild(this._stateSwitchButtonArtm);
    };

    const _Scene_Battle_startTargetSelection_Artm = Scene_Battle.prototype.startTargetSelection_Artm;
    Scene_Battle.prototype.startTargetSelection_Artm = function() {
        _Scene_Battle_startTargetSelection_Artm.call(this);
        const target = this._targetWindowArtm?.target();
        if (target?.isEnemy()) {
            BattleManager.callPseudo3dMethod?.("targeting", $gameTroop.aliveMembers());
        } else {
            BattleManager.callPseudo3dMethod?.("targeting", $gameParty.members());
        }
    };

    const _Scene_Battle_onTargetCancel_Artm = Scene_Battle.prototype.onTargetCancel_Artm;
    Scene_Battle.prototype.onTargetCancel_Artm = function() {
        _Scene_Battle_onTargetCancel_Artm.call(this);
        BattleManager.callPseudo3dMethod?.("endTargeting");
    };

    const _Scene_Battle_onStateCancel_Artm = Scene_Battle.prototype.onStateCancel_Artm;
    Scene_Battle.prototype.onStateCancel_Artm = function() {
        _Scene_Battle_onStateCancel_Artm.call(this);
        BattleManager.callPseudo3dMethod?.("endTargeting");
    };

    Scene_Battle.prototype.toggleTargetUnit_Artm = function() {
        if (!this._targetWindowArtm) return;
        const currentTarget = this._targetWindowArtm.target();
        const targets = this._targetWindowArtm._targets || [];
        let nextIndex = -1;
        if (currentTarget?.isActor()) {
            nextIndex = targets.findIndex(t => t.isEnemy());
        } else {
            nextIndex = targets.findIndex(t => t.isActor());
        }
        if (nextIndex >= 0) {
            SoundManager.playCursor();
            this._targetWindowArtm.select(nextIndex);
            this.showStateListWindow_Artm();

            const nextTarget = this._targetWindowArtm.target();
            if (nextTarget?.isEnemy()) {
                BattleManager.callPseudo3dMethod?.("targeting", $gameTroop.aliveMembers());
            } else {
                BattleManager.callPseudo3dMethod?.("targeting", $gameParty.members());
            }
        }
    };

    const _Scene_Battle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        _Scene_Battle_update.call(this);
        if (this._stateSwitchButtonArtm) {
            this.updateStateSwitchButton_Artm();
        }
    };

    Scene_Battle.prototype.updateStateSwitchButton_Artm = function() {
        const btn = this._stateSwitchButtonArtm;
        const nameWin = this._stateNameWindowArtm;
        const isVisible = Boolean(
            $dataSystem.optSideView &&
            nameWin && nameWin.visible &&
            this._stateListWindowArtm?.visible
        );
        btn.visible = isVisible;
        if (isVisible) {
            btn.x = nameWin.x + nameWin.width + 6;
            btn.y = nameWin.y + Math.max(0, (nameWin.height - btn.height) / 2);
        }
    };

    // -----------------------------------------------------
    // Window_BattleTarget
    // -----------------------------------------------------
    const _Window_BattleTarget_getChangedUnit = Window_BattleTarget.prototype.getChangedUnit;
    Window_BattleTarget.prototype.getChangedUnit = function() {
        const unit = _Window_BattleTarget_getChangedUnit.call(this);
        if (unit === "party") {
            BattleManager.callPseudo3dMethod?.("targeting", $gameParty.members());
        } else if (unit === "troop") {
            BattleManager.callPseudo3dMethod?.("targeting", $gameTroop.aliveMembers());
        }
        return unit;
    };

    // -----------------------------------------------------
    // Sprite_StateSwitchButton_Artm
    // -----------------------------------------------------
    function Sprite_StateSwitchButton_Artm() {
        this.initialize(...arguments);
    }
    
    Sprite_StateSwitchButton_Artm.prototype = Object.create(Sprite_Button.prototype);
    Sprite_StateSwitchButton_Artm.prototype.constructor = Sprite_StateSwitchButton_Artm;

    Sprite_StateSwitchButton_Artm.prototype.initialize = function(iconIndex) {
        this._iconIndex = iconIndex;
        Sprite_Button.prototype.initialize.call(this);
        this.createButtonBitmap();
        this.visible = false;
    };

    Sprite_StateSwitchButton_Artm.prototype.loadButtonImage = function() {
    };

    Sprite_StateSwitchButton_Artm.prototype.checkBitmap = function() {
    };

    Sprite_StateSwitchButton_Artm.prototype.buttonData = function() {
        return { x: 0, w: 1 };
    };

    Sprite_StateSwitchButton_Artm.prototype.hitTest = function(x, y) {
        const rect = new Rectangle(0, 0, BUTTON_SIZE, BUTTON_SIZE);
        return rect.contains(x, y);
    };

    Sprite_StateSwitchButton_Artm.prototype.createButtonBitmap = function() {
        const size = BUTTON_SIZE;
        const bmp = new Bitmap(size, size);
        bmp.fillAll("rgba(0, 0, 0, 0.5)");
        const iconBitmap = ImageManager.loadSystem("IconSet");
        const draw = () => {
            const sx = (this._iconIndex % 16) * ImageManager.iconWidth;
            const sy = Math.floor(this._iconIndex / 16) * ImageManager.iconHeight;
            const dw = Math.round(ImageManager.iconWidth * ICON_SCALE);
            const dh = Math.round(ImageManager.iconHeight * ICON_SCALE);
            const dx = Math.round((size - dw) / 2);
            const dy = Math.round((size - dh) / 2);
            bmp.blt(
                iconBitmap,
                sx, sy,
                ImageManager.iconWidth, ImageManager.iconHeight,
                dx, dy,
                dw, dh
            );
        };
        if (iconBitmap.isReady()) {
            draw();
        } else {
            iconBitmap.addLoadListener(draw);
        }
        this.bitmap = bmp;
        this.setColdFrame(0, 0, size, size);
        this.setHotFrame(0, 0, size, size);
        this.updateFrame();
    };

    Sprite_StateSwitchButton_Artm.prototype.onClick = function() {
        TouchInput.clear();
        const scene = SceneManager._scene;
        if (scene instanceof Scene_Battle) {
            scene.toggleTargetUnit_Artm();
        }
    };

})();