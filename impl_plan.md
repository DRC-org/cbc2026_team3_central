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

| # | ファイル | 内容 |
|---|---|---|
| 4-1 | `web/` scaffold | Vite + React + React Router + TypeScript 初期セットアップ |
| 4-2 | `useRobotSocket.ts` | WebSocket 接続管理、自動再接続、状態パース |
| 4-3 | `Dashboard.tsx` | 両ロボットの状態概要、シーケンス進行状況 |
| 4-4 | `RobotControl.tsx` | 操作画面: TriggerButton + SequenceProgress + MotorStatus 一覧 |
| 4-5 | `MotorTuning.tsx` | 個別モータのパラメータ調整（PID ゲイン等） |
| 4-6 | `EStopButton.tsx` | 常に画面上に表示される緊急停止ボタン |

### Phase 5: ロボット固有シーケンス

| # | ファイル | 内容 |
|---|---|---|
| 5-1 | `robots/main_hand.py` | メインハンドのシーケンスクラス（担当者が記述） |
| 5-2 | `robots/sub_hand.py` | サブハンドのシーケンスクラス（担当者が記述） |

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
