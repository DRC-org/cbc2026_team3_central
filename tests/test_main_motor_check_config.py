from __future__ import annotations

import logging

from main import (
    _DEFAULT_MOTOR_CHECK,
    _collect_per_motor_overrides,
    _load_motor_check_config,
)


def test_load_motor_check_uses_yaml_values() -> None:
    """単一 config から motor_check セクションを読み出すと yaml の値がそのまま反映される。"""
    configs = [
        {
            "robot_name": "r1",
            "motor_check": {
                "per_motor_timeout_ms": 2000,
                "default_magnitude": {
                    "m3508": 600,
                    "edulite05": 7.5,
                    "generic": 0.2,
                },
            },
        }
    ]

    result = _load_motor_check_config(configs)

    assert result["per_motor_timeout_ms"] == 2000.0
    assert result["default_magnitude"]["m3508"] == 600.0
    assert result["default_magnitude"]["edulite05"] == 7.5
    assert result["default_magnitude"]["generic"] == 0.2


def test_load_motor_check_defaults_when_missing() -> None:
    """motor_check セクションが存在しない config からはデフォルト値が返る。"""
    configs = [{"robot_name": "r1"}]

    result = _load_motor_check_config(configs)

    assert result["per_motor_timeout_ms"] == _DEFAULT_MOTOR_CHECK["per_motor_timeout_ms"]
    assert result["default_magnitude"] == _DEFAULT_MOTOR_CHECK["default_magnitude"]
    # 戻り値の default_magnitude は呼び出し側で破壊されてもデフォルト辞書に影響しないこと
    result["default_magnitude"]["m3508"] = 9999.0
    assert _DEFAULT_MOTOR_CHECK["default_magnitude"]["m3508"] != 9999.0


def test_load_motor_check_partial_default_magnitude() -> None:
    """yaml に default_magnitude の一部キーだけ存在する場合、残りはデフォルト値で補完される。"""
    configs = [
        {
            "robot_name": "r1",
            "motor_check": {
                # per_motor_timeout_ms は未指定 → デフォルト
                "default_magnitude": {
                    "m3508": 750,  # 他のキーは未指定
                },
            },
        }
    ]

    result = _load_motor_check_config(configs)

    assert result["per_motor_timeout_ms"] == _DEFAULT_MOTOR_CHECK["per_motor_timeout_ms"]
    assert result["default_magnitude"]["m3508"] == 750.0
    assert (
        result["default_magnitude"]["edulite05"]
        == _DEFAULT_MOTOR_CHECK["default_magnitude"]["edulite05"]
    )
    assert (
        result["default_magnitude"]["generic"]
        == _DEFAULT_MOTOR_CHECK["default_magnitude"]["generic"]
    )


def test_load_motor_check_warns_on_conflict(
    caplog: logging.LogCaptureFixture,
) -> None:
    """2 つの config の値が異なる場合は最初のものを採用し、warning を出す。"""
    configs = [
        {
            "robot_name": "r1",
            "motor_check": {
                "per_motor_timeout_ms": 1500,
                "default_magnitude": {"m3508": 500, "edulite05": 5.0, "generic": 0.1},
            },
        },
        {
            "robot_name": "r2",
            "motor_check": {
                "per_motor_timeout_ms": 3000,  # 異なる値
                "default_magnitude": {"m3508": 999, "edulite05": 5.0, "generic": 0.1},
            },
        },
    ]

    with caplog.at_level(logging.WARNING):
        result = _load_motor_check_config(configs)

    assert result["per_motor_timeout_ms"] == 1500.0  # 最初の config を採用
    assert result["default_magnitude"]["m3508"] == 500.0
    warnings = [rec for rec in caplog.records if rec.levelno == logging.WARNING]
    assert len(warnings) >= 2  # per_motor_timeout_ms と default_magnitude.m3508 の 2 件


def test_collect_per_motor_overrides_empty() -> None:
    """motors セクションがない場合は空辞書が返る。"""
    configs = [{"robot_name": "r1"}]

    assert _collect_per_motor_overrides(configs) == {}


def test_collect_per_motor_overrides_single() -> None:
    """1 モータの motor_check 上書きが正しく辞書化される。"""
    configs = [
        {
            "robot_name": "r1",
            "motors": {
                "lift_motor": {
                    "driver": "m3508",
                    "bus": "m3508_bus",
                    "can_id": 1,
                    "motor_check": {
                        "magnitude": 800,
                        "timeout_ms": 2000,
                    },
                },
                "arm_joint": {
                    "driver": "edulite05",
                    "bus": "edulite_bus",
                    "can_id": 1,
                    # motor_check なし
                },
            },
        }
    ]

    overrides = _collect_per_motor_overrides(configs)

    assert overrides == {
        "lift_motor": {"magnitude": 800.0, "timeout_ms": 2000.0},
    }


def test_collect_per_motor_overrides_multi_robots() -> None:
    """複数ロボット config からの上書きが 1 つの辞書にマージされる。"""
    configs = [
        {
            "robot_name": "main_hand",
            "motors": {
                "lift_motor": {
                    "driver": "m3508",
                    "bus": "m3508_bus",
                    "can_id": 1,
                    "motor_check": {"magnitude": 800},
                },
            },
        },
        {
            "robot_name": "sub_hand",
            "motors": {
                "gripper": {
                    "driver": "generic",
                    "bus": "generic_bus",
                    "can_id": 2,
                    "motor_check": {"timeout_ms": 2500},
                },
            },
        },
    ]

    overrides = _collect_per_motor_overrides(configs)

    assert overrides == {
        "lift_motor": {"magnitude": 800.0},
        "gripper": {"timeout_ms": 2500.0},
    }
