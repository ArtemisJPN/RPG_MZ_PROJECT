// *****************************************************
// ARTM_StatePopupCommandMZ.js
// Copyright (c) 2025 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// ***********************************************************************
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
 * ・サイドビュー戦闘ではマウスカーソルを対象者に置くだけで確認画面が開きます。
 *
 * ■ ステートのメモ欄（任意設定）
 * 【ステートの説明内容（指定がない場合はメッセージ1を自動表示）】
 *   <SPCMZ_DESC:ここに表示する説明を書きます>
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
    const SPCMZ_HIDE       = "SPCMZ_HIDE";
    const STATE_TURNS      = PARAMS.state_turns || "残り%ターン";
    const EMPTY_TEXT       = PARAMS.empty_text || "影響中のステートはありません";
    const TURNS_FONT_SIZE  = +(PARAMS.turns_font_size || "20");
    const TURNS_FONT_COLOR = PARAMS.turns_font_color || "255, 255, 50, 0.8";
    const TURNS_SORT       = PARAMS.turns_sort || "statePrior";
    const IS_DISP_ICON_PT  = (PARAMS.is_disp_icon_pt || "true").toLowerCase() === "true";
    const IS_DISP_ICON_EM  = (PARAMS.is_disp_icon_em || "true").toLowerCase() === "true";
    const IS_OPACITY_BT    = PARAMS.is_opacity_bt?.toLowerCase() === "true";
    const IS_OPACITY_ST    = PARAMS.is_opacity_st?.toLowerCase() === "true";
    const IS_OPACITY       = IS_OPACITY_BT || IS_OPACITY_ST;
    const RAW_KEY          = (PARAMS.shortcut_key || "S").trim();
    const BUTTON_ICON_INDEX = +(PARAMS.button_icon_index || "87");
    const BUTTON_OFFSET_X   = +(PARAMS.button_offset_x || "0");
    const SHORTCUT_KEY     = RAW_KEY.toLowerCase();

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
    };

    const _Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        _Scene_Battle_createAllWindows.call(this);
        this.createTargetWindow_Artm();
        this.createStateListWindow_Artm();
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
            new Rectangle(0, 0, 0, 0)
        );
    };

    Scene_Battle.prototype.createStateListWindow_Artm = function() {
        const rect = this.stateListWindowRect_Artm();
        this._stateListWindowArtm = new Window_BattleState(rect);
        this._stateListWindowArtm.setHelpWindow(this._helpWindow);
        this._stateListWindowArtm.setHandler("cancel", this.onStateCancel_Artm.bind(this));
        this._stateListWindowArtm.setHandler("pageup", this.onStatePageChange_Artm.bind(this, -1));
        this._stateListWindowArtm.setHandler("pagedown", this.onStatePageChange_Artm.bind(this, 1));
        this.addWindow_Artm(this._stateListWindowArtm);
        BattleManager.setStateListWindow_Artm(this._stateListWindowArtm);
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
        return this.skillWindowRect();
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

    // -----------------------------------------------------
    // Window_Selectable
    // -----------------------------------------------------
    const _Window_Selectable_processHandling = Window_Selectable.prototype.processHandling;
    Window_Selectable.prototype.processHandling = function() {
        _Window_Selectable_processHandling.call(this);
        const scene = SceneManager._scene;
        if (scene instanceof Scene_Battle && this === scene._actorCommandWindow) {
            if (scene.isStatePopupButtonActive_Artm() && Input.isTriggered(SHORTCUT_KEY)) {
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
        $gameParty.select(null);$gameTroop.select(null);
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
        const isStateListActive =
            this._stateListWindow && this._stateListWindow.isOpenAndActive();
        if (this.isOpenAndActive() || isStateListActive) {
            const target = $gameTemp.touchTarget();
            if (target && this._targets.includes(target)) {
                this.select(this._targets.indexOf(target));
                if ($gameTemp.touchState() === "click") {
                    if (!$dataSystem.optSideView) {
                        this.processOk();
                    } else if (this._stateListWindow) {
                        this._stateListWindow.setTarget(target);
                        this._stateListWindow.refresh();
                    }
                }
                $gameTemp.clearTouchState();
            }
        }
    };

    // -----------------------------------------------------
    // Window_StateList
    // -----------------------------------------------------
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
        this.refresh();
        this.scrollTo(0, 0);
    };

    Window_StateList.prototype.target = function() {
        return this._target;
    };

    Window_StateList.prototype.refresh = function() {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
        this.selectLast();
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
        return 2;
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
        this._data = [];
        if (!this._target) return;
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
        this._data = states;
        for (let i = 0, j = 0; i < this._target._buffs.length; i++) {
            if (
                this._target.isBuffOrDebuffAffected(i) &&
                !this._target.isBuffExpired(i)
            ) {
                const level = this._target._buffs[i];
                this._data.push({
                    paramId: i,
                    level: level,
                    iconIndex: this._target.buffIcons()[j++],
                    name: $dataSystem.terms.params[i]
                });
            }
        }
    };

    Window_StateList.prototype.drawAllItems = function() {
        Window_Selectable.prototype.drawAllItems.call(this);
        if (this._data.length === 0 && this._target) {
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
        if (state) {
            const turnsWidth = this.turnsWidth();
            const rect = this.itemLineRect(index);
            this.drawItemName(state, rect.x, rect.y, rect.width - turnsWidth);
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
            const orgFontSize = this.contents.fontSize;
            this.changeTextColor("rgba(" + TURNS_FONT_COLOR + ")");
            this.contents.fontSize = TURNS_FONT_SIZE;
            this.drawText(turnsText, x, y, width, "right");
            this.contents.fontSize = orgFontSize;
        }
    };

    Window_StateList.prototype.updateHelp = function() {
        const item = this.item();
        if (!item) {
            this._helpWindow?.setText(
                this._target ? `【${this._target.name()}】` : ""
            );
            return;
        }
        const desc = this.makeDescription(item);
        this._helpWindow?.setText(
            `【${this._target.name()}】${item.name}：${desc}`
        );
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
            const typeText = item.level > 0 ? "上昇" : "低下";
            return `${Math.abs(item.level)}段階${typeText}中`;
        }
        return "効果はありません。";
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
        this.showHelpWindow();
        Window_StateList.prototype.show.call(this);
    };

    Window_BattleState.prototype.hide = function() {
        this.hideHelpWindow();
        Window_StateList.prototype.hide.call(this);
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