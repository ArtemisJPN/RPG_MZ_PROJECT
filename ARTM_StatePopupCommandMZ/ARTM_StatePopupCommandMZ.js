// *****************************************************
// ARTM_StatePopupCommandMZ.js
// Copyright (c) 2025 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// ***********************************************************************
// ver.1.40: ステート関連の詳細画面表示を追加
// ver.1.30: ショートカットキー、ショートカットアイコンボタンの追加
// ver.1.21: 戦闘メニューにコマンドを追加する機能廃止（次verの機能改善の為）
// ver.1.20: ターゲット選択画面の非表示オプションを追加
// ver.1.10: バフ・デバフに対応
// ver.1.01: 0ターン目が表示されてしまう不具合を修正
// ver.1.00: 新規公開版
// ***********************************************************************
/*:ja
 * @target MZ
 * @plugindesc 戦闘中にステート・バフ状況の確認ウィンドウを追加するMZプラグイン
 * @author Artemis
 *
 * @help コマンド入力時にショートカットキーorボタンからステート・バフ確認画面を開きます。
 * メモ欄の設定がなくても自動で説明文が生成されるため、導入するだけで動作します。
 *
 * ■ 特徴・操作方法
 * ・プラグインパラメータで指定したショートカットキーか、ボタンアイコンを押すと
 *   対象者(味方or敵）のステート・バフ確認画面を開きます。
 * ・サイドビュー戦闘では対象者の立ち絵をクリックorタップするだけで確認画面が開きます。
 *
 * ■ ステートのメモ欄（任意設定）
 * 【ステートの説明内容（指定がない場合はメッセージ1を自動表示）】
 *   <SPCMZ_DESC:ここに表示する説明を書きます>
 *
 * 【右ウィンドウの詳細解説・ヒント（任意設定）】
 *   <SPCMZ_DETAIL:ここに詳細な解説やヒントを書きます>
 *   ※改行を含めることも可能です
 *
 * 【ステート一覧の除外対象】
 *   <SPCMZ_HIDE:>
 *
 * @param state_turns
 * @type string
 * @text 残りターン
 * @desc 残りターン表示を設定します。%に残りターン数が表示されます。
 * @default 残り%ターン
 *
 * @param empty_text
 * @type string
 * @text ステートなし表示テキスト
 * @desc ステートやバフにかかっていない場合に表示する文字です。
 * @default 影響中のステートはありません
 *
 * @param turns_font_size
 * @type number
 * @text 残りターンのフォントサイズ
 * @desc 残りターンのフォントサイズを指定します。
 * @default 20
 *
 * @param turns_font_color
 * @type string
 * @text 残りターンのフォントカラー
 * @desc 残りターンのフォントカラーをR,G,B,A形式で指定します。
 * @default 255, 255, 50, 0.8
 *
 * @param is_disp_icon_pt
 * @type boolean
 * @on 表示する
 * @off 表示しない
 * @text 味方パーティの状態アイコン
 * @desc 味方パーティの状態アイコン表示を設定します。
 * @default true
 *
 * @param is_disp_icon_em
 * @type boolean
 * @on 表示する
 * @off 表示しない
 * @text 敵方グループの状態アイコン
 * @desc 敵方グループの状態アイコン表示を設定します。
 * @default true
 *
 * @param is_opacity_bt
 * @type boolean
 * @on 透過有り
 * @off 透過無し
 * @text 対象者選択画面後ろの透過
 * @desc 対象者選択画面後ろのウィンドウ透過有無を設定します。
 * @default false
 *
 * @param is_opacity_st
 * @type boolean
 * @on 透過有り
 * @off 透過無し
 * @text ステート一覧画面後ろの透過
 * @desc ステート一覧画面後ろのウィンドウ透過有無を設定します。
 * @default false
 *
 * @param turns_sort
 * @type select
 * @option ステートID順
 * @value stateId
 * @option 優先度順
 * @value statePrior
 * @text ステートのソート方法
 * @desc ステートのソート方法を指定します。
 * @default statePrior
 *
 * @param shortcut_key
 * @type string
 * @text ショートカットキー
 * @desc 起動キーを自由に指定
 *（例: S, 1, Shift, Tab, Space, Control）
 * @default S
 *
 * @param button_icon_index
 * @type icon
 * @text ボタンのアイコンID
 * @desc 画面に表示するボタンのアイコン番号
 *（0にすると非表示）。
 * @default 177
 *
 * @param button_offset_x
 * @type number
 * @text ボタンのX相対オフセット
 * @desc 戻るボタンの左隣を基準として、さらに左へずらすドット数。
 *（他のカスタムボタンがある場合は大きめに設定して下さい。）
 * @default 0
 *
 */

function Window_BattleTarget() {
    this.initialize(...arguments);
}

(() => {
    const PLUGIN_NAME      = "ARTM_StatePopupCommandMZ";
    const PARAMS           = PluginManager.parameters(PLUGIN_NAME);
    const SPCMZ_DESC       = "SPCMZ_DESC";
    const SPCMZ_DETAIL     = "SPCMZ_DETAIL";
    const SPCMZ_HIDE       = "SPCMZ_HIDE";
    const STATE_TURNS      = PARAMS.state_turns || "残り%ターン";
    const EMPTY_TEXT       = PARAMS.empty_text || "なし";
    const TURNS_FONT_SIZE  = +(PARAMS.turns_font_size || "20");
    const TURNS_FONT_COLOR = PARAMS.turns_font_color || "255, 255, 50, 0.8";
    const TURNS_SORT       = PARAMS.turns_sort || "statePrior";
    const IS_DISP_ICON_PT  = (PARAMS.is_disp_icon_pt || "true").toLowerCase() === "true";
    const IS_DISP_ICON_EM  = (PARAMS.is_disp_icon_em || "true").toLowerCase() === "true";
    const IS_OPACITY_BT    = PARAMS.is_opacity_bt?.toLowerCase() === "true";
    const IS_OPACITY_ST    = PARAMS.is_opacity_st?.toLowerCase() === "true";
    const IS_OPACITY       = IS_OPACITY_BT || IS_OPACITY_ST;
    const RAW_KEY          = (PARAMS.shortcut_key || "S").trim();
    const BUTTON_ICON_INDEX = +(PARAMS.button_icon_index || "177");
    const BUTTON_OFFSET_X   = +(PARAMS.button_offset_x || "0");
    const SHORTCUT_KEY     = RAW_KEY.toLowerCase();

    // -----------------------------------------------------
    // プラグインパラメータ候補
    // -----------------------------------------------------
    const ARTM_DetailSectionTitles = {
        detail:  "【解説】",
        removal: "【解除条件】",
        effect:  "【主な効果】"
    };

    const ARTM_BuffLevelTexts = {
        up:   "上昇",
        down: "低下"
    };

    const ARTM_StateListTexts = {
        buffDesc: "%1段階%2中",
        noEffect: "効果はありません。"
    };

    const ARTM_RemovalTexts = {
        byDamage:     "被ダメージ時解除: %1%",
        turnTiming:   "ターン経過で解除 (%1)",
        battleEnd:    "戦闘終了で自動解除",
        byWalking:    "マップ歩行で解除 (%1歩)",
        noRemoval:    "自動解除なし（永続）",
        timingAction: "行動終了時",
        timingTurn:   "ターン終了時",
        buffTurn:     "ターン終了時に解除判定"
    };

    const ARTM_EffectTexts = {
        none:            "特別な効果はありません",
        restriction1:    "敵を無差別に攻撃",
        restriction2:    "味方を攻撃",
        restriction3:    "行動不能",
        hpRegen:         "HP再生率: %1%",
        mpRegen:         "MP再生率: %1%",
        paramRate:       "%1: ×%2%",
        buffEffect:      "%1: %2段階%3 (%4%)",
        elementRate:     "%1有効度: %2%",
        actionPlus:      "行動回数追加: +1回 (%1%)",
        xparamRate:      "%1: %2%"
    };

    // -----------------------------------------------------
    // Input
    // -----------------------------------------------------
    if (/^[a-zA-Z]$/.test(RAW_KEY)) {
        Input.keyMapper[RAW_KEY.toUpperCase().charCodeAt(0)] = SHORTCUT_KEY;
    } else if (/^[0-9]$/.test(RAW_KEY)) {
        Input.keyMapper[RAW_KEY.charCodeAt(0)] = SHORTCUT_KEY;
    } else if (SHORTCUT_KEY === "space") {
        Input.keyMapper[32] = "space";
    }

    // -----------------------------------------------------
    // Scene_Battle
    // -----------------------------------------------------
    Scene_Battle.prototype.addWindow_Artm = function(window) {
        if (IS_OPACITY !== false) {
            this._windowLayerSpc.addChild(window);
        } else {
            this.addWindow(window);
        }
    };

    const _Scene_Base_createWindowLayer = Scene_Base.prototype.createWindowLayer;
    Scene_Base.prototype.createWindowLayer = function() {
        _Scene_Base_createWindowLayer.call(this);
        if (this instanceof Scene_Battle && IS_OPACITY !== false) {
            this._windowLayerSpc = new WindowLayer();
            this._windowLayerSpc.x = this._windowLayer.x;
            this._windowLayerSpc.y = this._windowLayer.y;
            this.addChild(this._windowLayerSpc);
        }
    };

    Scene_Battle.prototype.commandStatePopup_Artm = function() {
        SoundManager.playOk();
        this.startTargetSelection_Artm();
    };

    Scene_Battle.prototype.startTargetSelection_Artm = function() {
        this._targetWindowArtm.refresh();
        if ($dataSystem.optSideView) {
            let initIndex = 0;
            if (BattleManager.actor()) {
                const actorIndex =
                    this._targetWindowArtm._targets.indexOf(BattleManager.actor());
                if (actorIndex >= 0) initIndex = actorIndex;
            }
            this._targetWindowArtm.select(initIndex);
            this._targetWindowArtm.setStateListWindow_Artm(this._stateListWindowArtm);
            this.showStateListWindow_Artm();
        } else {
            this._targetWindowArtm.show();
            this._targetWindowArtm.select(0);
            this._targetWindowArtm.activate();
            if (IS_OPACITY_BT === false) {
                this._statusWindow.hide();
            }
        }
    };

    Scene_Battle.prototype.showStateListWindow_Artm = function() {
        const target = this._targetWindowArtm.target();
        this._stateListWindowArtm.setTarget(target);
        this._stateListWindowArtm.refresh();
        this._stateListWindowArtm.show();
        this._stateListWindowArtm.activate();
        if (this._stateNameWindowArtm) {
            this._stateNameWindowArtm.setTarget(target);
            this._stateNameWindowArtm.show();
        }
        if (this._stateDetailWindowArtm) {
            this._stateDetailWindowArtm.setItem(
                this._stateListWindowArtm.item(),
                target
            );
            this._stateDetailWindowArtm.show();
        }
    };

    const _Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        _Scene_Battle_createAllWindows.call(this);
        this.createTargetWindow_Artm();
        this.createStateDetailWindow_Artm();
        this.createStateListWindow_Artm();
        this.createStateNameWindow_Artm();
    };

    Scene_Battle.prototype.createTargetWindow_Artm = function() {
        const rect = this.targetWindowRect_Artm();
        this._targetWindowArtm = new Window_BattleTarget(rect);
        this._targetWindowArtm.setHandler("ok", this.onTargetOk_Artm.bind(this));
        this._targetWindowArtm.setHandler("cancel", this.onTargetCancel_Artm.bind(this));
        this.addWindow_Artm(this._targetWindowArtm);
    };

    Scene_Battle.prototype.targetWindowRect_Artm = function() {
        return (
            !$dataSystem.optSideView ?
            this.enemyWindowRect() :
            new Rectangle(0, 0, 1, 1)
        );
    };

    Scene_Battle.prototype.createStateListWindow_Artm = function() {
        const rect = this.stateListWindowRect_Artm();
        this._stateListWindowArtm = new Window_BattleState(rect);
        this._stateListWindowArtm.setDetailWindow(this._stateDetailWindowArtm);
        this._stateListWindowArtm.setHandler("cancel", this.onStateCancel_Artm.bind(this));
        this._stateListWindowArtm.setHandler("pageup", this.onStatePageChange_Artm.bind(this, -1));
        this._stateListWindowArtm.setHandler("pagedown", this.onStatePageChange_Artm.bind(this, 1));
        this.addWindow_Artm(this._stateListWindowArtm);
        BattleManager.setStateListWindow_Artm(this._stateListWindowArtm);
    };

    Scene_Battle.prototype.createStateNameWindow_Artm = function() {
        const rect = new Rectangle(0, 0, 0, 0);
        this._stateNameWindowArtm = new Window_BattleStateName(rect);
        this._stateListWindowArtm.setNameWindow(this._stateNameWindowArtm);
        this.addWindow_Artm(this._stateNameWindowArtm);
    };

    Scene_Battle.prototype.onStatePageChange_Artm = function(direction) {
        if (!this._targetWindowArtm) return;
        const max = this._targetWindowArtm.maxItems();
        let nextIndex = this._targetWindowArtm.index() + direction;
        if (nextIndex < 0) nextIndex = max - 1;
        if (nextIndex >= max) nextIndex = 0;
        this._targetWindowArtm.select(nextIndex);
        this.showStateListWindow_Artm();
    };

    Scene_Battle.prototype.stateListWindowRect_Artm = function() {
        const baseRect = this.skillWindowRect();
        const halfWidth = Math.floor(baseRect.width / 2);
        return new Rectangle(baseRect.x, baseRect.y, halfWidth, baseRect.height);
    };

    Scene_Battle.prototype.createStateDetailWindow_Artm = function() {
        const rect = this.stateDetailWindowRect_Artm();
        this._stateDetailWindowArtm = new Window_BattleStateDetail(rect);
        this.addWindow_Artm(this._stateDetailWindowArtm);
    };

    Scene_Battle.prototype.stateDetailWindowRect_Artm = function() {
        const baseRect = this.skillWindowRect();
        const halfWidth = Math.floor(baseRect.width / 2);
        return new Rectangle(
            baseRect.x + halfWidth,
            baseRect.y,
            baseRect.width - halfWidth,
            baseRect.height
        );
    };

    const _Scene_Battle_isAnyInputWindowActive = Scene_Battle.prototype.isAnyInputWindowActive;
    Scene_Battle.prototype.isAnyInputWindowActive = function() {
        return (
            _Scene_Battle_isAnyInputWindowActive.call(this) ||
            this._targetWindowArtm?.active ||
            this._stateListWindowArtm?.active
        );
    };

    Scene_Battle.prototype.isStatePopupButtonActive_Artm = function() {
        return Boolean(
            !this._stateListWindowArtm?.visible &&
            !this._targetWindowArtm?.visible &&
            BattleManager.isInputting() &&
            BattleManager.actor() &&
            this._actorCommandWindow?.active &&
            this._actorCommandWindow?.visible &&
            !this._actorCommandWindow?.isClosing() &&
            this._actorCommandWindow?.openness > 0
        );
    };

    Scene_Battle.prototype.onTargetOk_Artm = function() {
        if (IS_OPACITY_ST === false) {
            this._commandWindowArtm?.hide();
            this._statusWindow.hide();
        } else {
            this._statusWindow.show();
        }
        this._targetWindowArtm.hide();
        this.showStateListWindow_Artm();
    };

    Scene_Battle.prototype.onTargetCancel_Artm = function() {
        this._targetWindowArtm.deactivate();
        this._targetWindowArtm.hide();
        this._statusWindow.show();
        this._commandWindowArtm?.show();
        this._commandWindowArtm?.activate();
    };

    Scene_Battle.prototype.onStateCancel_Artm = function() {
        this._stateListWindowArtm.hide();
        this._stateDetailWindowArtm?.hide();
        this._stateNameWindowArtm?.hide();
        if ($dataSystem.optSideView) {
            this._targetWindowArtm.deactivate();
            this._targetWindowArtm.hide();
            this._statusWindow.show();
            this._commandWindowArtm?.show();
            this._commandWindowArtm?.activate();
        } else {
            if (IS_OPACITY_BT === false) {
                this._statusWindow.hide();
            } else {
                this._statusWindow.show();
            }
            this._commandWindowArtm?.show();
            this._targetWindowArtm.show();
            this._targetWindowArtm.activate();
        }
    };

    const _Scene_Battle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        _Scene_Battle_update.call(this);
        if (
            $dataSystem.optSideView &&
            this._stateListWindowArtm?.isOpenAndActive()
        ) {
            this._targetWindowArtm?.processTouch();
        }
        if (this._statePopupButtonArtm) {
            this._statePopupButtonArtm.visible =
                this.isStatePopupButtonActive_Artm();
        }
    };

    const _Scene_Battle_createButtons = Scene_Battle.prototype.createButtons;
    Scene_Battle.prototype.createButtons = function() {
        _Scene_Battle_createButtons.call(this);
        if (BUTTON_ICON_INDEX > 0) {
            this.createStatePopupButton_Artm();
        }
    };

    Scene_Battle.prototype.createStatePopupButton_Artm = function() {
        this._statePopupButtonArtm =
            new Sprite_StatePopupButton(BUTTON_ICON_INDEX);
        this.addChild(this._statePopupButtonArtm);
    };

    const _Scene_Battle_terminate = Scene_Battle.prototype.terminate;
    Scene_Battle.prototype.terminate = function() {
        _Scene_Battle_terminate.call(this);
        BattleManager.setStateListWindow_Artm(null);
        if (_statePopupButtonBitmap) {
            _statePopupButtonBitmap.destroy();
            _statePopupButtonBitmap = null;
        }
    };

    // -----------------------------------------------------
    // Window_Selectable
    // -----------------------------------------------------
    const _Window_Selectable_processHandling = Window_Selectable.prototype.processHandling;
    Window_Selectable.prototype.processHandling = function() {
        _Window_Selectable_processHandling.call(this);
        const scene = SceneManager._scene;
        if (scene instanceof Scene_Battle && this === scene._actorCommandWindow) {
            if (
                scene.isStatePopupButtonActive_Artm() &&
                this.isOpenAndActive() &&
                Input.isTriggered(SHORTCUT_KEY) 
            ) {
                scene._commandWindowArtm = this;
                this.deactivate();
                scene.commandStatePopup_Artm();
            }
        }
    };

    // -----------------------------------------------------
    // Window_StatusBase
    // -----------------------------------------------------
    const _Window_StatusBase_placeStateIcon = Window_StatusBase.prototype.placeStateIcon;
    Window_StatusBase.prototype.placeStateIcon = function(actor, x, y) {
        if (!IS_DISP_ICON_PT) return;
        _Window_StatusBase_placeStateIcon.call(this, actor, x, y);
    };

    // -----------------------------------------------------
    // Window_BattleTarget
    // -----------------------------------------------------
    Window_BattleTarget.prototype = Object.create(Window_Selectable.prototype);
    Window_BattleTarget.prototype.constructor = Window_BattleTarget;

    Window_BattleTarget.prototype.initialize = function(rect) {
        this._targets = [];
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
        this.hide();
        this._targetPre = null;
    };

    Window_BattleTarget.prototype.setStateListWindow_Artm = function(window) {
        this._stateListWindow = window;
    };

    Window_BattleTarget.prototype.maxCols = function() {
        return 2;
    };

    Window_BattleTarget.prototype.maxItems = function() {
        return this._targets.length;
    };

    Window_BattleTarget.prototype.target = function() {
        return this._targets[this.index()];
    };

    Window_BattleTarget.prototype.drawItem = function(index) {
        const target = this._targets[index];
        const rect = this.itemLineRect(index);
        if (target.isActor()) {
            this.changeTextColor(ColorManager.textColor(4));
        } else if (target.isEnemy()) {
            this.changeTextColor(ColorManager.textColor(2));
        } else {
            this.resetTextColor();
        }
        this.changeOutlineColor(ColorManager.outlineColor());
        this.drawText(target.name(), rect.x, rect.y, rect.width);
    };

    Window_BattleTarget.prototype.show = function() {
        const index = this.index();
        this.refresh();
        this.forceSelect(index === -1 ? 0 : index);
        $gameTemp.clearTouchState();
        Window_Selectable.prototype.show.call(this);
    };

    Window_BattleTarget.prototype.hide = function() {
        Window_Selectable.prototype.hide.call(this);
        $gameParty.select(null);
        $gameTroop.select(null);
    };

    Window_BattleTarget.prototype.refresh = function() {
        this._targets = $gameParty.aliveMembers().concat($gameTroop.aliveMembers());
        Window_Selectable.prototype.refresh.call(this);
    };

    Window_BattleTarget.prototype.select = function(index) {
        Window_Selectable.prototype.select.call(this, index);
        const target = this.target();
        if (target) {
            this.unitChange();
            if (target.isActor()) {
                $gameParty.select(target);
            } else if (target.isEnemy()) {
                $gameTroop.select(target);
            }
        }
    };

    Window_BattleTarget.prototype.unitChange = function() {
        const changedUnit = this.getChangedUnit();
        if (changedUnit === "party" || changedUnit === "troop") {
            this._targetPre?.deselect();
        }
        if (this._stateListWindow) {
            this._stateListWindow.setTarget(this.target());
        }
        this._targetPre = this.target();
    };

    Window_BattleTarget.prototype.getChangedUnit = function() {
        const target = this.target();
        const targetPre = this._targetPre || target;
        if (target?.isActor() && targetPre?.isEnemy()) return "party";
        if (target?.isEnemy() && targetPre?.isActor()) return "troop";
        return "";
    };

    Window_BattleTarget.prototype.processTouch = function() {
        Window_Selectable.prototype.processTouch.call(this);
        if (!this.canProcessTouchTarget()) return;
        const target = $gameTemp.touchTarget();
        if (!this.isValidTouchTarget(target)) return;
        this.select(this._targets.indexOf(target));
        if ($gameTemp.touchState() === "click") {
            this.onTargetClicked(target);
        }
        $gameTemp.clearTouchState();
    };

    Window_BattleTarget.prototype.canProcessTouchTarget = function() {
        const isStateListActive = this._stateListWindow?.isOpenAndActive();
        if (!this.isOpenAndActive() && !isStateListActive) return false;
        return $dataSystem.optSideView ? TouchInput.isTriggered() : true;
    };

    Window_BattleTarget.prototype.isValidTouchTarget = function(target) {
        return Boolean(target && this._targets.includes(target));
    };

    Window_BattleTarget.prototype.onTargetClicked = function(target) {
        if (!$dataSystem.optSideView) {
            this.processOk();
        } else if (this._stateListWindow) {
            this._stateListWindow.setTarget(target);
            this._stateListWindow.refresh();
        }
    };

    // -----------------------------------------------------
    // Window_BattleStateName
    // -----------------------------------------------------
    function Window_BattleStateName() {
        this.initialize(...arguments);
    }

    Window_BattleStateName.prototype = Object.create(Window_Base.prototype);
    Window_BattleStateName.prototype.constructor = Window_BattleStateName;

    Window_BattleStateName.prototype.initialize = function(rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._target = null;
        this.hide();
    };

    Window_BattleStateName.prototype.setTarget = function(target) {
        this._target = target;
        this.refresh();
    };

    Window_BattleStateName.prototype.refresh = function() {
        if (!this._target) {
            this.contents.clear();
            return;
        }
        this.updatePlacement();
        this.drawTargetName();
    };

    Window_BattleStateName.prototype.updatePlacement = function() {
        const scene = SceneManager._scene;
        const name = this._target.name();
        const textWidth = this.textSizeEx(name).width;
        const width = Math.ceil(textWidth + this.padding * 2 + 16);
        const height = this.fittingHeight(1);
        const listWin = scene ? scene._stateListWindowArtm : null;
        const x = listWin ? listWin.x : 0;
        const y = listWin ? Math.max(0, listWin.y - height) : 0;
        const sizeChanged = (this.width !== width || this.height !== height);
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        if (sizeChanged || !this.contents) {
            this.createContents();
        }
    };

    Window_BattleStateName.prototype.drawTargetName = function() {
        this.contents.clear();
        this.changeTextColor(this.targetNameColor());
        this.drawText(this._target.name(), 0, 0, this.innerWidth, "center");
        this.resetTextColor();
    };

    Window_BattleStateName.prototype.targetNameColor = function() {
        if (this._target.isActor()) {
            return ColorManager.textColor(4);
        } else if (this._target.isEnemy()) {
            return ColorManager.textColor(2);
        }
        return ColorManager.normalColor();
    };

    // -----------------------------------------------------
    // Window_StateList
    // -----------------------------------------------------
    const TURNS_DISPLAY_MODE = ""; // ★プラグインパラメータ候補
    const ICON_TURNS_OFFSET_X = -2;
    const ICON_TURNS_OFFSET_Y = -2;

    function Window_StateList() {
        this.initialize(...arguments);
    }

    Window_StateList.prototype = Object.create(Window_Selectable.prototype);
    Window_StateList.prototype.constructor = Window_StateList;

    Window_StateList.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._target = null;
        this._data = [];
    };

    Window_StateList.prototype.setTarget = function(target) {
        this._target = target;
        if (this._nameWindow) {
            this._nameWindow.setTarget(target);
        }
        this.refresh();
        this.scrollTo(0, 0);
        if (this._detailWindow) {
            this._detailWindow.setItem(this.item(), target);
        }
    };

    Window_StateList.prototype.setNameWindow = function(window) {
        this._nameWindow = window;
    };

    Window_StateList.prototype.setDetailWindow = function(window) {
        this._detailWindow = window;
    };

    Window_StateList.prototype.target = function() {
        return this._target;
    };

    Window_StateList.prototype.refresh = function() {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
        this.selectLast();
    };

    Window_StateList.prototype.select = function(index) {
        Window_Selectable.prototype.select.call(this, index);
        if (this._detailWindow) {
            this._detailWindow.setItem(this.item(), this._target);
        }
    };

    Window_StateList.prototype.selectLast = function() {
        if (this._data.length > 0) {
            const index = Math.max(0, Math.min(this.index(), this._data.length - 1));
            this.forceSelect(index);
        } else {
            this.forceSelect(-1);
        }
    };

    Window_StateList.prototype.maxCols = function() {
        return 1;
    };

    Window_StateList.prototype.colSpacing = function() {
        return 16;
    };

    Window_StateList.prototype.maxItems = function() {
        return this._data ? this._data.length : 0;
    };

    Window_StateList.prototype.item = function() {
        return this.itemAt(this.index());
    };

    Window_StateList.prototype.itemAt = function(index) {
        return this._data && index >= 0 ? this._data[index] : null;
    };

    Window_StateList.prototype.makeItemList = function() {
        if (!this._target) {
            this._data = [];
            return;
        }
        this._data = [
            ...this.makeTargetStateItems(),
            ...this.makeTargetBuffItems()
        ];
    };

    Window_StateList.prototype.makeTargetStateItems = function() {
        const states = this._target.states().filter(item => {
            return (
                item &&
                item.meta[SPCMZ_HIDE] === undefined &&
                !this._target.isStateExpired(item.id)
            );
        });
        if (TURNS_SORT === "stateId") {
            states.sort((a, b) => a.id - b.id);
        } else if (TURNS_SORT === "statePrior") {
            states.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        }
        return states;
    };

    Window_StateList.prototype.makeTargetBuffItems = function() {
        const buffItems = [];
        const icons = this._target.buffIcons();
        let iconCursor = 0;
        for (let i = 0; i < this._target._buffs.length; i++) {
            if (!this._target.isBuffOrDebuffAffected(i)) continue;
            if (this._target.isBuffExpired(i)) continue;
            buffItems.push({
                paramId: i,
                level: this._target._buffs[i],
                iconIndex: icons[iconCursor++],
                name: $dataSystem.terms.params[i]
            });
        }
        return buffItems;
    };

    Window_StateList.prototype.drawAllItems = function() {
        Window_Selectable.prototype.drawAllItems.call(this);
        if (this._data.length === 0 && this._target) {
            this.resetTextColor();
            this.changePaintOpacity(false);
            this.drawText(
                EMPTY_TEXT, 0, 
                this.innerHeight / 2 - this.lineHeight() / 2,
                this.innerWidth, "center"
            );
            this.changePaintOpacity(true);
        }
    };

    Window_StateList.prototype.drawItem = function(index) {
        const state = this.itemAt(index);
        if (!state) {
            return;
        }
        const rect = this.itemLineRect(index);
        if (TURNS_DISPLAY_MODE === "icon") {
            this.drawItemName(state, rect.x, rect.y, rect.width);
            this.drawStateTurnsOnIcon(state, rect.x, rect.y);
        } else {
            this.drawItemName(state, rect.x, rect.y, rect.width - this.turnsWidth());
            this.drawStateTurns(state, rect.x, rect.y, rect.width);
        }
    };

    Window_StateList.prototype.turnsWidth = function() {
        return this.textWidth(STATE_TURNS.replace("%", "00"));
    };

    Window_StateList.prototype.drawStateTurns = function(state, x, y, width) {
        let turns = null;
        let isAutoRemoval = false;
        if (state.id) {
            turns = this._target._stateTurns[state.id];
            isAutoRemoval = state.autoRemovalTiming !== 0;
        } else if (state.paramId !== undefined) {
            turns = this._target._buffTurns[state.paramId];
            isAutoRemoval = true;
        }

        if (isAutoRemoval && turns !== null && turns !== undefined) {
            const turnsText = STATE_TURNS.replace("%", turns);
            this.changeTextColor("rgba(" + TURNS_FONT_COLOR + ")");
            this.contents.fontSize = TURNS_FONT_SIZE;
            this.drawText(turnsText, x, y, width, "right");
            this.resetFontSettings();
        }
    };

    Window_StateList.prototype.drawStateTurnsOnIcon = function(state, x, y) {
        const turns = this.autoRemovalTurns(state);
        if (turns === null) return;
        const rect = this.iconTurnsRect(x, y);
        this.setupIconTurnsFont();
        this.drawText(String(turns), rect.x, rect.y, rect.width, "center");
        this.resetFontSettings();
    };

    Window_StateList.prototype.autoRemovalTurns = function(state) {
        if (state.id && state.autoRemovalTiming !== 0) {
            return this._target._stateTurns[state.id] ?? null;
        }
        if (state.paramId !== undefined) {
            return this._target._buffTurns[state.paramId] ?? null;
        }
        return null;
    };

    Window_StateList.prototype.iconTurnsRect = function(x, y) {
        const cornerX = x + ImageManager.iconWidth;
        const cornerY = y + 2 + ImageManager.iconHeight;
        const boxW = 20;
        const boxH = this.lineHeight();
        return new Rectangle(
            Math.round(cornerX - boxW / 2) + ICON_TURNS_OFFSET_X,
            Math.round(cornerY - boxH / 2) + ICON_TURNS_OFFSET_Y,
            boxW,
            boxH
        );
    };

    Window_StateList.prototype.setupIconTurnsFont = function() {
        this.contents.fontSize = 14;
        this.changeTextColor("rgba(" + TURNS_FONT_COLOR + ")");
        this.contents.outlineColor = "rgba(0, 0, 0, 0.9)";
        this.contents.outlineWidth = 3;
    };

    Window_StateList.prototype.makeDescription = function(item) {
        if (item.meta && item.meta[SPCMZ_DESC]) {
            return item.meta[SPCMZ_DESC];
        }
        if (item.id && item.message1) {
            const name = this._target ? this._target.name() : "";
            return item.message1.replace("%1", name);
        }
        if (item.paramId !== undefined) {
            const typeText = item.level > 0 ? ARTM_BuffLevelTexts.up : ARTM_BuffLevelTexts.down;
            return ARTM_StateListTexts.buffDesc
                .replace("%1", Math.abs(item.level))
                .replace("%2", typeText);
        }
        return ARTM_StateListTexts.noEffect;
    };

    // -----------------------------------------------------
    // Window_BattleState
    // -----------------------------------------------------
    function Window_BattleState() {
        this.initialize(...arguments);
    }

    Window_BattleState.prototype = Object.create(Window_StateList.prototype);
    Window_BattleState.prototype.constructor = Window_BattleState;

    Window_BattleState.prototype.initialize = function(rect) {
        Window_StateList.prototype.initialize.call(this, rect);
        this.hide();
    };

    Window_BattleState.prototype.show = function() {
        this.selectLast();
        Window_StateList.prototype.show.call(this);
    };

    // -----------------------------------------------------
    // Window_BattleStateDetail
    // -----------------------------------------------------
    const BOTTOM_PADDING = 12;

    function Window_BattleStateDetail() {
        this.initialize(...arguments);
    }

    Window_BattleStateDetail.prototype = Object.create(Window_Scrollable.prototype);
    Window_BattleStateDetail.prototype.constructor = Window_BattleStateDetail;

    Window_BattleStateDetail.prototype.initialize = function(rect) {
        Window_Scrollable.prototype.initialize.call(this, rect);
        this._item = null;
        this._target = null;
        this.hide();
    };

    // ステータス拡張プラグインなどに連携する際はこの関数を書き換える
    Window_BattleStateDetail.prototype.xparamName = function(dataId) {
        const defaultNames = [
            "命中率", "回避率", "会心率", "会心回避率",
            "魔法回避率", "魔法反射率", "反撃率",
            "HP再生率", "MP再生率", "TP再生率"
        ];
        return defaultNames[dataId] || "";
    };

    Window_BattleStateDetail.prototype.setItem = function(item, target) {
        if (this._item !== item || this._target !== target) {
            this._item = item;
            this._target = target;
            this.scrollTo(0, 0);
            this.refresh();
        }
    };

    Window_BattleStateDetail.prototype.updateOrigin = function() {
        this.origin.y = this.scrollY();
    };

    Window_BattleStateDetail.prototype.detailLineHeight = function() {
        return this.lineHeight() - 4;
    };

    Window_BattleStateDetail.prototype.overallHeight = function() {
        return Math.max(this.innerHeight, (this._cachedTotalHeight || 0));
    };

    Window_BattleStateDetail.prototype.scrollX = function() {
        return this._scrollX || 0;
    };

    Window_BattleStateDetail.prototype.scrollY = function() {
        return this._scrollY || 0;
    };

    Window_BattleStateDetail.prototype.maxScrollY = function() {
       const diff = this.overallHeight() - this.innerHeight;
        return diff > BOTTOM_PADDING ? diff : 0;
    };

    Window_BattleStateDetail.prototype.scrollTo = function(x, y) {
        const maxY = this.maxScrollY();
        this._scrollY = Math.max(0, Math.min(y, maxY));
        this.origin.y = this._scrollY;
        this.updateArrows();
    };

    Window_BattleStateDetail.prototype.scrollBy = function(x, y) {
        this.scrollTo(this.scrollX() + x, this.scrollY() + y);
    };

    Window_BattleStateDetail.prototype.processWheelScroll = function() {
        const threshold = 20;
        if (TouchInput.wheelY >= threshold) {
            this.scrollBy(0, this.lineHeight());
        }
        if (TouchInput.wheelY <= -threshold) {
            this.scrollBy(0, -this.lineHeight());
        }
    };

    Window_BattleStateDetail.prototype.refresh = function() {
        this.calculateTotalHeight();
        this.updateArrows();
        const w = this.innerWidth;
        const h = this.overallHeight();
        if (!this.contents || this.contents.width !== w || this.contents.height !== h) {
            this.contents = new Bitmap(w, h);
        } else {
            this.contents.clear();
        }
        this.resetFontSettings();
        this.drawAllDetailContent();
    };

    Window_BattleStateDetail.prototype.calculateTotalHeight = function() {
        if (!this._item) {
            this._cachedTotalHeight = this.innerHeight;
            return;
        }
        const lh = this.lineHeight();
        const tightLh = this.detailLineHeight();
        const conds = this.makeRemovalConditions(this._item);
        const effects = this.makeEffects(this._item);
        const condLines = conds.length === 0 ? 1 : conds.length;
        const effectLines = effects.length === 0 ? 1 : effects.length;
        const detailLines = this.detailTextLines(this._item);
        const detailHeight = detailLines.length > 0 ? (lh + detailLines.length * tightLh + 4) : 0;
        const contentBottom = (lh * 2) + ((condLines + effectLines) * tightLh) + 4 + detailHeight;
        if (contentBottom <= this.innerHeight) {
            this._cachedTotalHeight = this.innerHeight;
        } else {
            this._cachedTotalHeight = contentBottom + BOTTOM_PADDING;
        }
    };

    Window_BattleStateDetail.prototype.drawAllDetailContent = function() {
        if (!this._item) {
            this.drawEmpty();
            return;
        }
        let y = 0;
        y = this.drawDetailText(y);
        y = this.drawDetailSectionTitle(ARTM_DetailSectionTitles.removal, y);
        y = this.drawRemovalConditions(y);
        y += 4;
        y = this.drawDetailSectionTitle(ARTM_DetailSectionTitles.effect, y);
        this.drawEffects(y);
    };

    Window_BattleStateDetail.prototype.drawEmpty = function() {
        this.resetTextColor();
        this.changePaintOpacity(false);
        this.drawText(
            EMPTY_TEXT,
            0,
            this.innerHeight / 2 - this.lineHeight() / 2,
            this.innerWidth,
            "center"
        );
        this.changePaintOpacity(true);
    };

    Window_BattleStateDetail.prototype.drawDetailSectionTitle = function(title, y) {
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(title, 0, y, this.innerWidth);
        this.resetTextColor();
        return y + this.lineHeight();
    };

    Window_BattleStateDetail.prototype.detailTextLines = function(item) {
        if (!item || !item.meta || !item.meta[SPCMZ_DETAIL]) return [];
        const rawText = String(item.meta[SPCMZ_DETAIL]);
        return rawText.split("\\n");
    };

    Window_BattleStateDetail.prototype.drawDetailText = function(y) {
        const lines = this.detailTextLines(this._item);
        if (lines.length === 0) return y;
        y = this.drawDetailSectionTitle(ARTM_DetailSectionTitles.detail, y);
        const indent = 12;
        const tightLh = this.detailLineHeight();
        this.contents.fontSize = 20;
        for (const line of lines) {
            this.drawText(line, indent, y, this.innerWidth - indent);
            y += tightLh;
        }
        this.resetFontSettings();
        return y + 4;
    };

    Window_BattleStateDetail.prototype.drawRemovalConditions = function(y) {
        const texts = ARTM_RemovalTexts;
        const conditions = this.makeRemovalConditions(this._item);
        const indent = 12;
        const tightLh = this.detailLineHeight();
        this.contents.fontSize = 20;
        if (conditions.length === 0) {
            this.drawText(`・${texts.noRemoval}`, indent, y, this.innerWidth - indent);
            y += tightLh;
        } else {
            for (const cond of conditions) {
                this.drawText(`・${cond}`, indent, y, this.innerWidth - indent);
                y += tightLh;
            }
        }
        this.resetFontSettings();
        return y;
    };

    Window_BattleStateDetail.prototype.makeRemovalConditions = function(item) {
        if (item.id) {
            return this.makeStateRemovalConditions(item);
        } else if (item.paramId !== undefined) {
            return this.makeBuffRemovalConditions(item);
        }
        return [];
    };

    Window_BattleStateDetail.prototype.makeStateRemovalConditions = function(item) {
        const conditions = [];
        const texts = ARTM_RemovalTexts;

        if (item.removeByDamage) {
            conditions.push(texts.byDamage.replace("%1", item.chanceByDamage));
        }
        if (item.autoRemovalTiming !== 0) {
            conditions.push(this.formatTurnRemovalText(item));
        }
        if (item.removeAtBattleEnd) {
            conditions.push(texts.battleEnd);
        }
        if (item.removeByWalking) {
            conditions.push(texts.byWalking.replace("%1", item.stepsToRemoveCells));
        }
        return conditions;
    };

    Window_BattleStateDetail.prototype.makeBuffRemovalConditions = function(item) {
        const texts = ARTM_RemovalTexts;
        return [
            texts.buffTurn,
            texts.battleEnd
        ];
    };

    Window_BattleStateDetail.prototype.formatTurnRemovalText = function(item) {
        const texts = ARTM_RemovalTexts;
        const timingMap = {
            1: texts.timingAction,
            2: texts.timingTurn
        };
        const timingText = timingMap[item.autoRemovalTiming] || "";
        return texts.turnTiming.replace("%1", timingText);
    };

    Window_BattleStateDetail.prototype.drawEffects = function(y) {
        const texts = ARTM_EffectTexts;
        const effects = this.makeEffects(this._item);
        const indent = 12;
        const tightLh = this.detailLineHeight();
        this.contents.fontSize = 20;
        if (effects.length === 0) {
            this.drawText(`・${texts.none}`, indent, y, this.innerWidth - indent);
        } else {
            for (const effect of effects) {
                this.drawText(`・${effect}`, indent, y, this.innerWidth - indent);
                y += tightLh;
            }
        }
        this.resetFontSettings();
    };

    Window_BattleStateDetail.prototype.makeEffects = function(item) {
        if (item.id) {
            return this.makeStateEffects(item);
        } else if (item.paramId !== undefined) {
            return this.makeBuffEffects(item);
        }
        return [];
    };

    Window_BattleStateDetail.prototype.makeStateEffects = function(item) {
        return [
            ...this.makeRestrictionEffects(item),
            ...this.makeTraitEffects(item)
        ];
    };

    Window_BattleStateDetail.prototype.makeRestrictionEffects = function(item) {
        const restrictionMap = {
            1: ARTM_EffectTexts.restriction1,
            2: ARTM_EffectTexts.restriction2,
            4: ARTM_EffectTexts.restriction3
        };
        const text = restrictionMap[item.restriction];
        return text ? [text] : [];
    };

    Window_BattleStateDetail.prototype.makeTraitEffects = function(item) {
        if (!item.traits) return [];
        const effects = [];
        for (const trait of item.traits) {
            const text = this.parseTraitEffect(trait);
            if (text) effects.push(text);
        }
        return effects;
    };

    Window_BattleStateDetail.prototype.parseTraitEffect = function(trait) {
        if (trait.code === Game_BattlerBase.TRAIT_PARAM) {
            const paramName = TextManager.param(trait.dataId);
            const rate = Math.round(trait.value * 100);
            return ARTM_EffectTexts.paramRate.replace("%1", paramName).replace("%2", rate);
        }
        if (trait.code === Game_BattlerBase.TRAIT_XPARAM) {
            const value = Math.round(trait.value * 100);
            const sign = value > 0 ? `+${value}` : `${value}`;

            if (trait.dataId === 7) return ARTM_EffectTexts.hpRegen.replace("%1", sign);
            if (trait.dataId === 8) return ARTM_EffectTexts.mpRegen.replace("%1", sign);

            const name = this.xparamName(trait.dataId);
            if (name) {
                return ARTM_EffectTexts.xparamRate.replace("%1", name).replace("%2", sign);
            }
        }
        if (trait.code === Game_BattlerBase.TRAIT_ELEMENT_RATE) {
            const elemName = $dataSystem.elements[trait.dataId] || "";
            const rate = Math.round(trait.value * 100);
            return ARTM_EffectTexts.elementRate.replace("%1", elemName).replace("%2", rate);
        }
        if (trait.code === Game_BattlerBase.TRAIT_ACTION_PLUS) {
            const chance = Math.round(trait.value * 100);
            return ARTM_EffectTexts.actionPlus.replace("%1", chance);
        }
        return null;
    };

    Window_BattleStateDetail.prototype.makeBuffEffects = function(item) {
        const texts = ARTM_EffectTexts;
        const target = this._target;
        const paramId = item.paramId;
        const paramName = TextManager.param(paramId);
        const level = item.level;
        const typeText = level > 0 ? ARTM_BuffLevelTexts.up : ARTM_BuffLevelTexts.down;
        const rate = (target && typeof target.paramBuffRate === "function")
            ? Math.round(target.paramBuffRate(paramId) * 100) 
            : 100;
        const count = Math.abs(level);
        return [
            texts.buffEffect
                .replace("%1", paramName)
                .replace("%2", count)
                .replace("%3", typeText)
                .replace("%4", rate)
        ];
    };

    Window_BattleStateDetail.prototype.update = function() {
        Window_Scrollable.prototype.update.call(this);
        if (this.visible && this.isTouchedInsideFrame()) {
            this.processTouchScroll();
            this.processWheelScroll();
        }
    };

    Window_BattleStateDetail.prototype.processTouchScroll = function() {
        if (TouchInput.isMoved() && TouchInput.isPressed()) {
            const deltaY = TouchInput.y - (this._touchLastY ?? TouchInput.y);
            this.scrollBy(0, -deltaY);
            this._touchLastY = TouchInput.y;
        } else {
            this._touchLastY = null;
        }
    };

    // -----------------------------------------------------
    // BattleManager
    // -----------------------------------------------------
    BattleManager.setStateListWindow_Artm = function(window) {
        this._stateListWindowArtm = window;
    };

    BattleManager.getStateListWindow_Artm = function() {
        return this._stateListWindowArtm;
    };

    Game_Battler.prototype.refreshStateListWindow = function() {
        const stateListWindow = BattleManager.getStateListWindow_Artm();
        if (stateListWindow?.visible && this === stateListWindow.target()) {
            stateListWindow.refresh();
            const detailWindow = stateListWindow._detailWindow;
            if (detailWindow?.visible) {
                detailWindow.setItem(stateListWindow.item(), this);
            }
        }
    };

    const _Game_Battler_onTurnEnd = Game_Battler.prototype.onTurnEnd;
    Game_Battler.prototype.onTurnEnd = function() {
        _Game_Battler_onTurnEnd.call(this);
        this.refreshStateListWindow();
    };

    const _Game_Battler_addState = Game_Battler.prototype.addState;
    Game_Battler.prototype.addState = function(stateId) {
        _Game_Battler_addState.call(this, stateId);
        this.refreshStateListWindow();
    };

    const _Game_Battler_removeState = Game_Battler.prototype.removeState;
    Game_Battler.prototype.removeState = function(stateId) {
        _Game_Battler_removeState.call(this, stateId);
        this.refreshStateListWindow();
    };

    // -----------------------------------------------------
    // Sprite_Enemy
    // -----------------------------------------------------
    const _Sprite_Enemy_createStateIconSprite = Sprite_Enemy.prototype.createStateIconSprite;
    Sprite_Enemy.prototype.createStateIconSprite = function() {
        _Sprite_Enemy_createStateIconSprite.call(this);
        if (!IS_DISP_ICON_EM && this._stateIconSprite) {
            this.removeChild(this._stateIconSprite);
            this._stateIconSprite.destroy();
            this._stateIconSprite = null;
        }
    };

    // -----------------------------------------------------
    // Sprite_StatePopupButton
    // -----------------------------------------------------
    function Sprite_StatePopupButton() {
        this.initialize(...arguments);
    }

    let _statePopupButtonBitmap = null;
    function createStatePopupButtonBitmap(iconIndex) {
        if (_statePopupButtonBitmap) return _statePopupButtonBitmap;
        const w = ImageManager.iconWidth + 12;
        const h = ImageManager.iconHeight + 12;
        const bmp = new Bitmap(w, h);
        bmp.fillAll("rgba(0, 0, 0, 0.4)");
        const iconBitmap = ImageManager.loadSystem("IconSet");
        const draw = () => {
            const sx = (iconIndex % 16) * ImageManager.iconWidth;
            const sy = Math.floor(iconIndex / 16) * ImageManager.iconHeight;
            bmp.blt(
                iconBitmap, sx, sy,
                ImageManager.iconWidth, ImageManager.iconHeight,
                6, 6
            );
        };
        if (iconBitmap.isReady()) {
            draw();
        } else {
            iconBitmap.addLoadListener(draw);
        }
        _statePopupButtonBitmap = bmp;
        return _statePopupButtonBitmap;
    }
    const _Scene_Battle_isReady = Scene_Battle.prototype.isReady;
    Scene_Battle.prototype.isReady = function() {
        if (BUTTON_ICON_INDEX > 0) {
            createStatePopupButtonBitmap(BUTTON_ICON_INDEX);
        }
        return _Scene_Battle_isReady.call(this);
    };

    Sprite_StatePopupButton.prototype = Object.create(Sprite_Button.prototype);
    Sprite_StatePopupButton.prototype.constructor = Sprite_StatePopupButton;

    Sprite_StatePopupButton.prototype.initialize = function(iconIndex) {
        this._iconIndex = iconIndex;
        Sprite_Button.prototype.initialize.call(this);
        this.createBitmap();
    };

    Sprite_StatePopupButton.prototype.loadButtonImage = function() {
    };

    Sprite_StatePopupButton.prototype.checkBitmap = function() {
    };

    Sprite_StatePopupButton.prototype.buttonData = function() {
        return { x: 0, w: 1 };
    };

    Sprite_StatePopupButton.prototype.createBitmap = function() {
        const w = ImageManager.iconWidth + 12;
        const h = ImageManager.iconHeight + 12;
        this.bitmap = createStatePopupButtonBitmap(this._iconIndex);
        this.setColdFrame(0, 0, w, h);
        this.setHotFrame(0, 0, w, h);
        this.updateFrame();
    };

    Sprite_StatePopupButton.prototype.update = function() {
        Sprite_Button.prototype.update.call(this);
        this.updatePosition();
    };

    Sprite_StatePopupButton.prototype.updatePosition = function() {
        const scene = SceneManager._scene;
        if (scene?._cancelButton) {
            const spacing = 4;
            this.x = scene._cancelButton.x - this.width - spacing - BUTTON_OFFSET_X;
            this.y = scene._cancelButton.y;
        } else {
            const buttonWidth = ImageManager.iconWidth + 12;
            this.x = Graphics.boxWidth - buttonWidth - 8 - BUTTON_OFFSET_X;
            this.y = 4;
        }
    };

    Sprite_StatePopupButton.prototype.onClick = function() {
        const scene = SceneManager._scene;
        if (scene instanceof Scene_Battle) {
            if (!scene.isStatePopupButtonActive_Artm()) return;
            scene._commandWindowArtm = scene._actorCommandWindow;
            scene._actorCommandWindow.deactivate();
            scene.commandStatePopup_Artm();
        }
    };

})();