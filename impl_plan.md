# CBC2026 Team3 中央制御プログラム 実装計画

## 概要

キャチロボバトルコンテスト 2026 に出場するロボットの中央制御プログラム。
固定型ロボットにメインハンドとサブハンドがあり、それぞれ半自動シーケンス制御で動作する。

### 技術スタック

- **バックエンド**: Python 3.12+ / asyncio（単一プロセス）
- **CAN 通信**: python-can + SocketCAN
- **Web UI**: Vite + React + React Router + TypeScript
- **通信**: WebSocket（JSON）
- **サーバー**: aiohttp（HTTP 静的配信 + WebSocket を統合）

### 開発ツールチェーン

| ツール | 用途 |
|---|---|
| **uv** | パッケージマネージャ・仮想環境管理（pip/venv の代替） |
| **ruff** | リンター + フォーマッター（flake8/black/isort の代替） |
| **pytest** | テストフレームワーク |
| **pytest-asyncio** | asyncio テスト対応 |
| **mypy** | 型チェック（任意、余裕があれば） |

#### uv の使い方

```bash
# プロジェクト初期化（pyproject.toml ベース）
uv init

# 依存追加
uv add python-can aiohttp pyyaml
uv add --dev pytest pytest-asyncio ruff

# 仮想環境での実行
uv run python main.py
uv run pytest

# ruff
uv run ruff check .       # リント
uv run ruff format .      # フォーマット
```

### 設計判断

- **ROS 2 不採用**: 固定型 + 一本道シーケンスでは DDS のメリットが薄く、WebSocket 通信との統合で不要な複雑性が生じるため
- **Python メイン**: シーケンス制御の記述性を優先。モータドライバ側で PID が閉じており、中央 PC からは目標値送信のみなので asyncio で十分なリアルタイム性を確保できる
- **aiohttp 採用**: 静的ファイル配信と WebSocket を 1 プロセスで統合でき、localhost:8080 で全機能を提供可能

---

## ハードウェア構成

### モータ

| モータ | 個数 | ESC/ドライバ | CAN プロトコル |
|---|---|---|---|
| DJI M3508 | 2 | C620 ESC | CAN 2.0A Standard Frame |
| RobStride EDULITE 05 | 2 | 内蔵 | CAN 2.0B Extended Frame (29bit) |
| DC モータ / サーボ | 多数 | 自作モータドライバ | CAN 2.0A Standard Frame（後述） |

### CAN バス構成（3 系統）

| バス | USB-CAN アダプタ | 接続デバイス |
|---|---|---|
| can0 | CANable #1 | M3508 × 2 |
| can1 | CANable #2 | EDULITE 05 × 2 |
| can2 | CANable #3 | DC モータ / サーボ（自作モタドラ） |

---

## 自作モータドライバ用 CAN プロトコル

CAN 2.0A Standard Frame（11bit ID）を使用。RobStride の Extended Frame と衝突しない。

### CAN ID レイアウト（11bit）

```
Bit10~8 (3bit): コマンド種別
Bit7~0  (8bit): デバイスID (0x01~0xFE)
```

| コマンド種別 | 値 | 方向 | 説明 |
|---|---|---|---|
| SET_TARGET | 0b000 | PC → モタドラ | 目標値設定 |
| FEEDBACK | 0b001 | モタドラ → PC | 状態フィードバック |
| SET_MODE | 0b010 | PC → モタドラ | 動作モード変更 |
| SET_PARAM | 0b011 | PC → モタドラ | パラメータ変更（PID ゲイン等） |
| E_STOP | 0b111 | PC → モタドラ | 緊急停止（デバイス ID=0xFF で全体停止） |

### データフレーム定義

**SET_TARGET（目標値設定）**

```
Byte 0:    制御タイプ (0=position, 1=velocity, 2=duty)
Byte 1:    予約
Byte 2-5:  目標値 (float32, little-endian)
Byte 6-7:  予約
```

**FEEDBACK（フィードバック）**

```
Byte 0-1:  現在位置 (int16, 0.1deg 単位 or エンコーダ値)
Byte 2-3:  現在速度 (int16, rpm)
Byte 4-5:  電流 (int16, mA)
Byte 6:    温度 (uint8, ℃)
Byte 7:    状態フラグ (bit0=到達, bit1=過電流, bit2=過熱)
```

**E_STOP（緊急停止）**

CAN ID = `0x7FF`（コマンド種別=0b111, デバイスID=0xFF）、データ不要、全デバイスが受信して即停止。

---

## アーキテクチャ

```
┌──────────────────────────────────────┐
│         Web UI (React + Vite)        │
│   localhost:8080                      │
│   ボタン: [次へ] [緊急停止] [状態表示]   │
└──────────────┬───────────────────────┘
               │ WebSocket (localhost:8080/ws)
┌──────────────▼───────────────────────┐
│      Central Controller (Python)     │
│      asyncio ベースの単一プロセス       │
│                                      │
│  ┌────────────┐  ┌────────────────┐  │
│  │ aiohttp    │  │  Sequence      │  │
│  │ Server     │  │  Engine        │  │
│  │ HTTP + WS  │  │  (FSM)         │  │
│  └─────┬──────┘  └───────┬────────┘  │
│        │                 │           │
│  ┌─────▼─────────────────▼────────┐  │
│  │       CAN Manager              │  │
│  │  ┌─────────┐ ┌──────────────┐  │  │
│  │  │ M3508   │ │ EDULITE 05   │  │  │
│  │  │ Driver  │ │ Driver       │  │  │
│  │  │(can0)   │ │(can1)        │  │  │
│  │  └────┬────┘ └──────┬───────┘  │  │
│  │  ┌────┴─────────────┴───────┐  │  │
│  │  │ Generic Driver (can2)    │  │  │
│  │  └──────────┬───────────────┘  │  │
│  └─────────────┼──────────────────┘  │
└────────────────┼─────────────────────┘
                 │ SocketCAN
    ┌────────────┼────────────┐
 [can0]       [can1]       [can2]
 USB-CAN#1   USB-CAN#2   USB-CAN#3
    │            │            │
[M3508×2] [EDULITE05×2] [DC/Servo...]
```

---

## テスト戦略

### 方針: プロトコル層とシーケンスエンジンを TDD で開発

実機デバッグで時間が溶けやすいバイト列の組み立てミスや状態遷移のバグを、テストで先に潰す。

### テスト対象とアプローチ

| レイヤー | TDD | テスト手法 |
|---|---|---|
| **M3508 プロトコル** | ◎ | エンコード/デコードの単体テスト。期待するバイト列との比較 |
| **EDULITE 05 プロトコル** | ◎ | 29bit CAN ID 組み立て・パース、値マッピングの単体テスト |
| **自作モタドラプロトコル** | ◎ | エンコード/デコードの単体テスト |
| **シーケンスエンジン** | ◎ | モータドライバを mock し、ステップ遷移・trigger 待ち・エラー処理をテスト |
| **config パース** | ○ | YAML → ドライバインスタンス生成の単体テスト |
| **CAN 実通信** | △ | vcan（仮想 CAN）を使った統合テスト。CI でも実行可能 |
| **WebSocket プロトコル** | ○ | JSON パース/生成の単体テスト |
| **aiohttp サーバー** | △ | aiohttp.test_utils で最低限の結合テスト |
| **Web UI (React)** | - | 今回はスコープ外 |

### vcan を使った統合テスト

```bash
# vcan セットアップ（テスト実行前に 1 回だけ）
sudo modprobe vcan
sudo ip link add dev vcan0 type vcan
sudo ip link set up vcan0
```

pytest の fixture で vcan バスを自動セットアップし、実際の CAN フレーム送受信をテストする。

### テストファイル構成

```
tests/
├── conftest.py                  # 共通 fixture（mock モータ、vcan セットアップ等）
├── drivers/
│   ├── test_m3508.py            # M3508 エンコード/デコード
│   ├── test_edulite05.py        # EDULITE 05 エンコード/デコード
│   └── test_generic.py          # 自作プロトコル エンコード/デコード
├── test_sequence_engine.py      # シーケンスエンジンの状態遷移
├── test_can_manager.py          # vcan を使った統合テスト
└── test_ws_protocol.py          # WebSocket JSON プロトコル
```

### TDD の流れ（各ドライバ実装時）

1. プロトコル仕様からテストケースを先に書く（期待するバイト列、変換値）
2. テストが RED になることを確認
3. ドライバを実装して GREEN にする
4. ruff format + ruff check でコード品質を確認

### テスト実行

```bash
uv run pytest                    # 全テスト実行
uv run pytest tests/drivers/     # ドライバテストのみ
uv run pytest -x                 # 最初の失敗で停止
uv run pytest -k "m3508"         # M3508 関連のみ
```

---

## ディレクトリ構成

```
cbc2026_team3_central/
├── pyproject.toml
├── config/
│   ├── main_hand.yaml
│   └── sub_hand.yaml
├── lib/
│   ├── __init__.py
│   ├── can_manager.py
│   ├── drivers/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── m3508.py
│   │   ├── edulite05.py
│   │   └── generic.py
│   ├── sequence/
│   │   ├── __init__.py
│   │   └── engine.py
│   └── server.py
├── robots/
│   ├── __init__.py
│   ├── main_hand.py
│   └── sub_hand.py
├── web/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── router.tsx
│       ├── hooks/
│       │   └── useRobotSocket.ts
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── RobotControl.tsx
│       │   └── MotorTuning.tsx
│       └── components/
│           ├── SequenceProgress.tsx
│           ├── MotorStatus.tsx
│           ├── TriggerButton.tsx
│           └── EStopButton.tsx
├── main.py
└── tests/
    ├── conftest.py
    ├── drivers/
    │   ├── test_m3508.py
    │   ├── test_edulite05.py
    │   └── test_generic.py
    ├── test_sequence_engine.py
    ├── test_can_manager.py
    └── test_ws_protocol.py
```

---

## WebSocket プロトコル（JSON）

### Server → Client（状態配信）

```jsonc
{
  "type": "state",
  "robot": "main_hand",
  "sequence": "pick_and_place",
  "current_step": "extend_arm",
  "step_index": 1,
  "total_steps": 5,
  "waiting_trigger": true,
  "motors": {
    "m3508_1": { "pos": 1500, "vel": 0.0, "torque": 0.2, "temp": 35.0 },
    "edulite_1": { "pos": 0.5, "vel": 0.0, "torque": 0.1, "temp": 28.0 }
  }
}
```

### Client → Server（操作）

```jsonc
{ "type": "trigger", "robot": "main_hand" }
{ "type": "e_stop" }
{ "type": "set_param", "motor": "m3508_1", "key": "kp", "value": 1.5 }
```

---

## Web UI ページ構成

| パス | ページ | 内容 |
|---|---|---|
| `/` | Dashboard | 両ロボットの状態概要、シーケンス進行状況 |
| `/main-hand` | RobotControl | メインハンド操作画面（トリガーボタン + 進行表示 + モータ状態） |
| `/main-hand/motors` | MotorTuning | メインハンドのモータ個別調整 |
| `/sub-hand` | RobotControl | サブハンド操作画面 |
| `/sub-hand/motors` | MotorTuning | サブハンドのモータ個別調整 |

---

## config.yaml 構造

```yaml
robot_name: main_hand

can_buses:
  m3508_bus: can0
  edulite_bus: can1
  generic_bus: can2

motors:
  lift_motor:
    driver: m3508
    bus: m3508_bus
    can_id: 1
  arm_joint:
    driver: edulite05
    bus: edulite_bus
    can_id: 1
    mode: position
  gripper:
    driver: generic
    bus: generic_bus
    can_id: 0x01
    control_type: position
```

---

## シーケンス記述例

```python
from lib.sequence.engine import Sequence, step

class PickAndPlace(Sequence):
    @step("初期位置へ移動")
    async def move_to_home(self):
        await self.motors.m3508_1.set_position(0)
        await self.motors.edulite_1.set_position(0)
        await self.wait_all_reached()

    @step("アーム展開", require_trigger=True)
    async def extend_arm(self):
        await self.motors.m3508_1.set_position(1500)
        await self.wait_all_reached()

    @step("ハンド閉じる")
    async def close_hand(self):
        await self.motors.servo_1.set_angle(90)
        await asyncio.sleep(0.5)
```

---

## 実装フェーズ

### Phase 1: 基盤（CAN 通信レイヤー）— TDD

| # | ファイル | 内容 |
|---|---|---|
| 1-1 | `pyproject.toml` | プロジェクト設定（uv 管理）。依存: python-can, aiohttp, pyyaml / dev: pytest, pytest-asyncio, ruff |
| 1-2 | `lib/drivers/base.py` | MotorDriver 基底クラス（set_position, set_velocity, get_state 等のインターフェース） |
| 1-3 | `tests/drivers/test_m3508.py` | **テスト先行**: M3508 エンコード/デコードのテストを書く |
| 1-4 | `lib/drivers/m3508.py` | C620 プロトコル実装（テストを GREEN にする） |
| 1-5 | `tests/drivers/test_edulite05.py` | **テスト先行**: EDULITE 05 のテストを書く |
| 1-6 | `lib/drivers/edulite05.py` | RobStride プロトコル実装（テストを GREEN にする） |
| 1-7 | `tests/drivers/test_generic.py` | **テスト先行**: 自作モタドラプロトコルのテストを書く |
| 1-8 | `lib/drivers/generic.py` | 自作モタドラプロトコル実装（テストを GREEN にする） |
| 1-9 | `lib/can_manager.py` | python-can の asyncio ラッパー。バス名 → Bus オブジェクト管理、送受信キュー |
| 1-10 | `tests/test_can_manager.py` | vcan を使った CAN 送受信の統合テスト |

### Phase 2: シーケンスエンジン — TDD

| # | ファイル | 内容 |
|---|---|---|
| 2-1 | `tests/test_sequence_engine.py` | **テスト先行**: ステップ遷移、trigger 待ち、エラー処理のテスト |
| 2-2 | `lib/sequence/engine.py` | シーケンスエンジン実装（テストを GREEN にする） |
| 2-3 | `config/main_hand.yaml` | モータ定義（名前、ドライバ種別、CAN バス、CAN ID、制御モード） |
| 2-4 | `config/sub_hand.yaml` | 同上 |

### Phase 3: サーバー + WebSocket

| # | ファイル | 内容 |
|---|---|---|
| 3-1 | `tests/test_ws_protocol.py` | **テスト先行**: WebSocket JSON プロトコルのパース/生成テスト |
| 3-2 | `lib/server.py` | aiohttp で HTTP（静的ファイル配信）+ WebSocket 統合。JSON プロトコルでの状態配信・コマンド受信 |
| 3-3 | `main.py` | config 読み込み → CAN 初期化 → シーケンス登録 → サーバー起動。asyncio.gather で全部回す |

### Phase 4: Web UI

#### ツール構成（2026-04 確定）

| 項目 | 採用 | 補足 |
|---|---|---|
| パッケージマネージャ | **pnpm@10**（`packageManager` フィールドで固定）| `web/.npmrc` に `auto-install-peers=true` |
| Linter | **oxlint** | `web/.oxlintrc.json`、react/typescript/unicorn/import/jsx-a11y プラグイン |
| Formatter | **oxfmt** (Beta) | `web/.oxfmtrc.json`、Tailwind ソート + import ソート組み込み |
| ESLint / Prettier | 不採用（削除済み）| oxlint + oxfmt に集約 |
| フォント | `@fontsource/inter` + `@fontsource-variable/noto-sans-jp` + `@fontsource-variable/jetbrains-mono`（自己ホスト） | Tailwind `@theme` の `--font-sans` で英→Inter、日本語→Noto Sans JP のグリフ単位フォールバック |
| アイコン | `lucide-react` | 絵文字非依存。`Icon` 共通ラッパー経由で利用 |
| テーマ | **ライトのみ**（パープル基調 `oklch(55% 0.22 295)`） | `web/src/index.css` の `@theme` でトークン定義 |
| scripts | `dev` / `build` / `preview` / `lint` / `lint:fix` / `format` / `format:check` / `check` | `check` = `lint && format:check && tsc -b --noEmit` |

#### ファイル一覧

| # | ファイル | 内容 |
|---|---|---|
| 4-1 | `web/` scaffold | Vite + React + React Router + TypeScript 初期セットアップ |
| 4-2 | `useRobotSocket.ts` | WebSocket 接続管理、自動再接続、状態パース、`e_stop_state` 専用イベント受信 |
| 4-3 | `Dashboard.tsx` | 両ロボットの状態概要を Card 化して表示、操縦画面へのリンク |
| 4-4 | `RobotControl.tsx` | 操作画面: SequenceProgress + 大型 TriggerButton + MotorSummary（折りたたみ）|
| 4-5 | `MotorTuning.tsx` | モータごとの状態 + PID パラメータ調整（Slider + 送信ボタン） |
| 4-6 | `EStopButton.tsx` | ヘッダー右に常設。lucide AlertTriangle アイコン + 黄黒ストライプ装飾 |
| 4-7 | `EStopOverlay.tsx` | 全画面赤フラッシュ + パルスリング + 進捗リング SVG。時計回り 90° ツイストで解除 |
| 4-8 | `AppHeader.tsx` | 共通ヘッダー（lucide アイコン化）+ Drawer メニュー（NavLink ベース）+ 全画面切替 |
| 4-9 | `router.tsx` | レイアウトルートで AppHeader と EStopOverlay を一元化、各ページから重複排除 |
| 4-10 | `components/Icon.tsx`, `StatusDot.tsx`, `StatPill.tsx`, `ConnectionStatus.tsx`, `SequenceProgress.tsx`, `MotorStatus.tsx`, `MotorSummary.tsx`, `TriggerButton.tsx` | デザイントークンに準拠した共通 UI 部品 |
| 4-11 | `index.css` / `index.html` | `@theme` トークン定義（色・フォント・影・角丸）、`color-scheme: light` 固定 |

### Phase 5: ロボット固有シーケンス

| # | ファイル | 内容 |
|---|---|---|
| 5-1 | `robots/main_hand.py` | メインハンドのシーケンスクラス（担当者が記述） |
| 5-2 | `robots/sub_hand.py` | サブハンドのシーケンスクラス（担当者が記述） |

### Phase 6: CAN Bus ヘルスチェック — TDD

運用中に検出したい異常は H1 バス断線/バスオフ、H2 モータ無応答、H3 バス輻輳/エラー多発、H4 モータ自身の異常（過熱・過電流）の 4 種類。受動監視（受信タイムスタンプ + 送信失敗例外）を主体とし、能動 ping は明示要求時のみとする。状態は WS 配信と `GET /health` の両方で公開する。

#### データ構造

```python
# lib/health.py
class BusHealth(Enum): OK / DEGRADED / DOWN
class MotorHealth(Enum): OK / STALE / WARNING / FAULT

@dataclass BusHealthInfo:
    name, channel, state, last_tx_at, last_rx_at,
    tx_error_count, rx_error_count, bus_off

@dataclass MotorHealthInfo:
    name, bus, state, last_feedback_at, feedback_age_ms,
    temperature, detail

@dataclass HealthSnapshot:
    timestamp, overall, buses, motors
```

#### WebSocket プロトコル拡張

Server → Client `state` メッセージに `health` フィールドを同梱:

```jsonc
{
  "type": "state",
  "robot": "main_hand",
  ...,
  "health": {
    "overall": "ok",
    "buses": [{ "name": "m3508_bus", "channel": "can0", "state": "ok",
                "last_rx_at": 1714377600.12, "tx_error_count": 0, "bus_off": false }],
    "motors": [{ "name": "lift_motor", "bus": "m3508_bus", "state": "ok",
                 "feedback_age_ms": 23.4, "temperature": 35.0 }]
  }
}
```

状態遷移の瞬間に push する専用イベント:
```jsonc
{ "type": "health_change", "level": "critical",
  "target": "bus:m3508_bus", "from": "ok", "to": "down",
  "message": "can0 bus_off detected" }
```

Client → Server の即時要求:
```jsonc
{ "type": "health_check" }
```

#### HTTP エンドポイント

`GET /health` → `HealthSnapshot` を JSON で返す。`overall` に応じて HTTP ステータス 200 (OK) / 503 (DEGRADED|DOWN) を返却。CI・監視ツール・`curl` 動作確認用。

#### config（既定値）

```yaml
health:
  feedback_timeout_ms: 500     # この時間フィードバックなければ STALE
  bus_check_interval_ms: 1000  # bus.state ポーリング周期
  temp_warning_c: 65
  temp_critical_c: 80
  tx_error_threshold: 96       # CAN 標準: error_passive 境界
```

#### 実装タスク

| # | ファイル | 内容 |
|---|---|---|
| 6-1 | `tests/test_health.py` | **テスト先行**: しきい値判定、状態遷移（ヒステリシス含む）、JSON シリアライズ |
| 6-2 | `lib/health.py` | `BusHealth` / `MotorHealth` 列挙、`*HealthInfo` / `HealthSnapshot` dataclass、JSON 化 |
| 6-3 | `lib/drivers/base.py` (修正) | `MotorDriver` に `has_thermal_warning()` / `has_overcurrent_warning()` / `is_fault()` のデフォルト実装を追加 |
| 6-4 | `lib/drivers/m3508.py` (修正) | C620 フィードバックの温度・電流からフラグ判定 |
| 6-5 | `lib/drivers/edulite05.py` (修正) | RobStride のステータス領域を解釈 |
| 6-6 | `lib/drivers/generic.py` (修正) | フィードバック Byte7 の bit0=到達 / bit1=過電流 / bit2=過熱 を解釈 |
| 6-7 | `tests/test_can_manager_health.py` | **テスト先行**: vcan で 受信タイムアウト → STALE、送信失敗 → DOWN 遷移、`bus.state` 反映 |
| 6-8 | `lib/can_manager.py` (修正) | 送受信時刻記録、`bus.state` ポーリング、`health()` メソッド、`_health_check_loop` 追加 |
| 6-9 | `tests/test_server_health.py` | **テスト先行**: WS state に `health` 同梱、`GET /health` の 200/503、`health_change` push |
| 6-10 | `lib/server.py` (修正) | `_build_state_message` で health 同梱、`/health` ルート追加、状態遷移検出で `health_change` push |
| 6-11 | `config/*.yaml` (修正) | `health:` セクション追加（既定値は上記） |
| 6-12 | `web/src/components/HealthIndicator.tsx` | バス/モータごとに信号灯（緑黄赤）+ 詳細ツールチップ |
| 6-13 | `web/src/pages/Dashboard.tsx` (修正) | ヘッダ近傍に overall 表示、警告時はトースト通知 |
| 6-14 | `web/src/hooks/useRobotSocket.ts` (修正) | `health` パース、`health_change` ハンドリング |

#### 段階的実装計画

| 段階 | 成果物 | 動作確認 |
|---|---|---|
| ① データ型 | 6-1, 6-2 | `pytest tests/test_health.py` |
| ② ドライバ拡張 | 6-3〜6-6 | 既存ドライバテストに warning/fault 判定を追加 |
| ③ CANManager 拡張 | 6-7, 6-8 | vcan で送信止めて 600ms 後 STALE、shutdown で DOWN 遷移を確認 |
| ④ サーバー統合 | 6-9, 6-10 | `aiohttp.test_utils` で `GET /health` 200/503、WS ペイロード検証 |
| ⑤ config 反映 | 6-11 | dry-run 起動でしきい値読み込み確認 |
| ⑥ Web UI | 6-12〜6-14 | `npm run dev` で表示。config しきい値を短くして遷移を目視 |

#### リスクと回避策

| リスク | 回避策 |
|---|---|
| ヘルスチェックループが CAN 受信を阻害 | 受動監視主体・能動 ping は明示要求時のみ |
| しきい値が厳しすぎて誤警報（チャタリング） | config で上書き可能。STALE→OK 復帰には連続 N フレーム受信を要求 |
| 送信エラーで `_receive_loop` が落ちる | `send_to_bus` の例外を握って health に反映、ループは継続 |
| bus_off からの自動復帰 | `bus.recover()` を試行回数制限付きで呼び、ログに残す |

#### アクチュエータ動作確認シーケンス

受動監視（H1〜H4）を補完する **能動テスト**。Web UI の「動作確認」ボタンから起動し、各モータを 1 つずつ微小駆動して指令への応答を視覚的に確認する。

##### コンセプト

- 受動監視 = 「いま壊れていないか？」、能動テスト = 「いま指示を出したら正しく動くか？」を別物として扱う
- 通常シーケンス（main_hand / sub_hand）と **同じエンジンを使い回さない**。`MotorCheckRunner` が独立して 1 モータずつ駆動・元の状態に戻す
- 緊急停止中・通常シーケンス実行中・バス DOWN 時はボタンを無効化（誤操作防止）

##### モータごとの判定ロジック

| ドライバ | 投入指令 | 判定基準 |
|---|---|---|
| **M3508** (電流制御) | 目標電流 ±500 mA を 1s 印加 | 1s 以内にフィードバック受信 + `velocity` の符号が指令電流と一致 |
| **EDULITE 05** (位置制御) | 現在位置 ±5° を 1s 指令 | 1s 以内にフィードバック受信 + `position` が目標±許容に到達 |
| **Generic** (位置/速度制御) | `control_type` に応じた微小目標 | フィードバック受信 + `reached` フラグ立ち上がり、過電流/過熱フラグなし |

判定ロジックを呼び出し側に漏らさないよう、`MotorDriver` 基底クラスに `check_command(*, magnitude)` / `evaluate_check_result(state, target)` を定義し各ドライバが自身の動作確認パラメータを保持。

##### データ構造（`lib/health.py` に追加）

```python
class MotorCheckResult(Enum):
    PENDING / RUNNING / PASSED / FAILED / TIMEOUT / SKIPPED

@dataclass MotorCheckRecord:
    motor, bus, started_at, finished_at, result,
    expected, observed, detail

@dataclass CheckRunSnapshot:
    robot, started_at, finished_at,
    overall,  # "running" | "ok" | "partial" | "failed"
    records: list[MotorCheckRecord]
```

##### WebSocket / HTTP プロトコル

Client → Server:
```jsonc
{ "type": "motor_check_start", "robot": "main_hand" }
{ "type": "motor_check_abort", "robot": "main_hand" }
```

Server → Client（実行中ストリーム）:
```jsonc
{ "type": "motor_check_progress", "robot": "main_hand",
  "current": "arm_joint", "index": 1, "total": 4 }

{ "type": "motor_check_record", "robot": "main_hand",
  "record": { "motor": "lift_motor", "result": "passed",
              "expected": 500, "observed": 487.2, "detail": null } }

{ "type": "motor_check_done", "robot": "main_hand",
  "snapshot": { ...CheckRunSnapshot... } }
```

HTTP:
- `POST /robots/{robot}/motor_check` → 起動。即時 `{ "started": true }` を返し、結果は WS で配信
- `GET /robots/{robot}/motor_check/last` → 直近結果のスナップショット

##### 実行フロー

```
RobotServer.handle("motor_check_start")
  └─ MotorCheckRunner(robot, can_manager, motors).run()
       1) 緊急停止 / 通常シーケンス実行中なら拒否
       2) ロックを取り、CheckRunSnapshot を初期化
       3) for motor in motors:
            - record.result = RUNNING / WS push (motor_check_progress)
            - msg = motor.check_command()
            - last_rx_at の現在値を記録
            - send + 観測待ち（タイムアウト T 秒）
            - motor.evaluate_check_result(state, target) → PASSED/FAILED
            - 元の位置 / 0 電流に戻す指令を必ず送る
            - WS push (motor_check_record)
       4) overall = all/some/none passed
       5) WS push (motor_check_done) / lock release
```

##### 安全策

- 動作確認シーケンス開始前に **確認ダイアログ必須**（「全モータを順番に微小駆動します。周囲の安全を確認してください」）
- 各モータの指令量は **物理的に安全な微小量に固定**（config で上書き可能）
- 動作確認実行中も **緊急停止コマンドは即時優先**（既存 e_stop 経路）
- M3508 の電流指令はリリース時に必ず 0 を再送（駆動状態を残さない）

##### config（既定値）

```yaml
motor_check:
  per_motor_timeout_ms: 1500     # 1 モータあたりのタイムアウト
  default_magnitude:
    m3508: 500                   # mA
    edulite05: 5.0               # deg
    generic: 0.1                 # 0.1 rev / 10% duty 等（control_type 依存）
  tolerance:
    edulite05_deg: 1.0
```

config の `motors` 内で個別上書き:
```yaml
motors:
  lift_motor:
    driver: m3508
    bus: m3508_bus
    can_id: 1
    motor_check:
      magnitude: 800             # この個体のみ 800mA で確認
      timeout_ms: 2000
```

##### 実装タスク

| # | ファイル | 内容 |
|---|---|---|
| 6-15 | `tests/test_motor_check.py` | **テスト先行**: モック CAN で PASSED/FAILED/TIMEOUT、abort、競合（通常シーケンス中 / 緊急停止中の拒否）|
| 6-16 | `lib/drivers/base.py` (修正) | `check_command(*, magnitude)` / `evaluate_check_result(state, target)` 抽象メソッド + デフォルト実装 |
| 6-17 | `lib/drivers/m3508.py` (修正) | 電流指令版の check 実装 |
| 6-18 | `lib/drivers/edulite05.py` (修正) | 位置指令版の check 実装 |
| 6-19 | `lib/drivers/generic.py` (修正) | `control_type` に応じた check 実装 |
| 6-20 | `lib/motor_check.py` (新規) | `MotorCheckRunner`, `CheckRunSnapshot`, `MotorCheckRecord` |
| 6-21 | `tests/test_server_motor_check.py` | **テスト先行**: WS の `motor_check_start` / `_progress` / `_record` / `_done` の流れ、緊急停止中・シーケンス中の拒否 |
| 6-22 | `lib/server.py` (修正) | コマンドハンドラ追加（`motor_check_start` / `_abort`）+ HTTP ルート + WS イベント発火 |
| 6-23 | `config/*.yaml` (修正) | `motor_check:` セクション + モータ単位の上書き |
| 6-24 | `web/src/hooks/useMotorCheck.ts` | WS イベント集約 hook |
| 6-25 | `web/src/components/MotorCheckButton.tsx` | ヘッダボタン + 確認ダイアログ。緊急停止中 / シーケンス中 / バス DOWN で無効化 |
| 6-26 | `web/src/components/MotorCheckPanel.tsx` | 実行中の進捗 + モータごとの ✓×、終了後はサマリ + リトライ |
| 6-27 | `web/src/pages/Dashboard.tsx` (修正) | パネル組み込み |

##### 段階追加

| 段階 | 成果物 | 動作確認 |
|---|---|---|
| ⑦ ドライバ check API | 6-15〜6-19 | 各ドライバ単体テスト（PASSED/FAILED/TIMEOUT） |
| ⑧ MotorCheckRunner | 6-20 | モック CAN で全シナリオ再現 + abort 動作確認 |
| ⑨ サーバー統合 | 6-21, 6-22 | WS で `_start` → 進捗 → 完了の一連を確認、競合拒否 |
| ⑩ config 反映 | 6-23 | dry-run でモータ別パラメータが効くか |
| ⑪ Web UI | 6-24〜6-27 | dry-run + Web UI から実押下・結果表示・無効化ロジックの目視確認 |

---

## RobStride EDULITE 05 プロトコル概要

調査結果のサマリー。RobStride シリーズは全モデル共通プロトコル。

- **CAN 2.0B Extended Frame（29bit ID）、1Mbps**
- 29bit ID 構造: `[通信タイプ 5bit][データエリア2 16bit][宛先ID 8bit]`
- デフォルト モータ ID: `0x7F`
- 制御モード: MIT(0) / 位置(1) / 速度(2) / 電流(3)
- フィードバック: 角度・角速度・トルク・温度（各 16bit → 物理量に線形マッピング）

### 主要リソース

- 公式 GitHub: https://github.com/RobStride
- EDULITE A3 (Python SDK + ROS2): https://github.com/RobStride/EDULITE_A3
- STM32 サンプル: https://github.com/RobStride/SampleProgram
- Rust crate: https://docs.rs/robstride/latest/robstride/
- Seeed Studio Wiki: https://wiki.seeedstudio.com/robstride_control/
