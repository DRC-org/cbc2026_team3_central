from __future__ import annotations

import logging

from main import _DEFAULT_HEALTH, _load_health_config


def test_load_health_config_uses_yaml_values() -> None:
    """単一 config から health セクションを読み出すと yaml の値がそのまま反映される。"""
    configs = [
        {
            "robot_name": "r1",
            "health": {
                "feedback_timeout_ms": 250,
                "temp_warning_c": 50,
                "temp_critical_c": 70,
                "tx_error_threshold": 64,
            },
        }
    ]

    result = _load_health_config(configs)

    assert result["feedback_timeout_ms"] == 250
    assert result["temp_warning_c"] == 50
    assert result["temp_critical_c"] == 70
    assert result["tx_error_threshold"] == 64


def test_load_health_config_defaults_when_missing() -> None:
    """health セクションが存在しない config からはデフォルト値が返る。"""
    configs = [{"robot_name": "r1"}]

    result = _load_health_config(configs)

    assert result == _DEFAULT_HEALTH


def test_load_health_config_uses_first_when_consistent(
    caplog: logging.LogCaptureFixture,
) -> None:
    """両 config が同じ値なら最初のものを採用し、警告ログは出さない。"""
    health = {
        "feedback_timeout_ms": 400,
        "temp_warning_c": 60,
        "temp_critical_c": 75,
        "tx_error_threshold": 80,
    }
    configs = [
        {"robot_name": "r1", "health": dict(health)},
        {"robot_name": "r2", "health": dict(health)},
    ]

    with caplog.at_level(logging.WARNING):
        result = _load_health_config(configs)

    assert result["feedback_timeout_ms"] == 400
    assert result["temp_warning_c"] == 60
    assert result["temp_critical_c"] == 75
    assert result["tx_error_threshold"] == 80
    assert not any(rec.levelno == logging.WARNING for rec in caplog.records)


def test_load_health_config_warns_on_conflict(
    caplog: logging.LogCaptureFixture,
) -> None:
    """2 つの config の値が異なる場合は最初のものを採用し、warning を出す。"""
    configs = [
        {
            "robot_name": "r1",
            "health": {
                "feedback_timeout_ms": 500,
                "temp_warning_c": 65,
                "temp_critical_c": 80,
                "tx_error_threshold": 96,
            },
        },
        {
            "robot_name": "r2",
            "health": {
                "feedback_timeout_ms": 300,  # 異なる値
                "temp_warning_c": 65,
                "temp_critical_c": 80,
                "tx_error_threshold": 96,
            },
        },
    ]

    with caplog.at_level(logging.WARNING):
        result = _load_health_config(configs)

    assert result["feedback_timeout_ms"] == 500  # 最初の config を採用
    warnings = [rec for rec in caplog.records if rec.levelno == logging.WARNING]
    assert len(warnings) >= 1


def test_load_health_config_partial_override() -> None:
    """yaml に一部のキーだけ存在する場合、残りはデフォルト値で補完される。"""
    configs = [
        {
            "robot_name": "r1",
            "health": {
                "temp_critical_c": 90,  # 他のキーは未指定
            },
        }
    ]

    result = _load_health_config(configs)

    assert result["temp_critical_c"] == 90
    assert result["feedback_timeout_ms"] == _DEFAULT_HEALTH["feedback_timeout_ms"]
    assert result["temp_warning_c"] == _DEFAULT_HEALTH["temp_warning_c"]
    assert result["tx_error_threshold"] == _DEFAULT_HEALTH["tx_error_threshold"]
