"""
Example usage of the Model Plugin system.

This script demonstrates:
1. Loading and configuring the ModelRegistry
2. Registering the ModelAPlugin
3. Generating signals from Model A
4. Using the EnsembleService (when multiple models are available)

Run this script to verify the plugin system is working correctly.
"""

import asyncio
from datetime import date, timedelta

from app.core import logger
from app.features.models.plugins import ModelAPlugin
from app.features.models.registry import model_registry
from app.features.models.services import EnsembleService


async def example_model_a_plugin():
    """
    Example: Use ModelAPlugin directly to generate signals.
    """
    logger.info("=" * 70)
    logger.info("Example 1: ModelAPlugin Direct Usage")
    logger.info("=" * 70)

    # Initialize plugin
    plugin = ModelAPlugin(
        model_id="model_a",
        version="v1.1",
        weight=0.6,
        enabled=True,
    )

    logger.info(f"Plugin config: {plugin.config}")
    logger.info(f"Plugin enabled: {plugin.is_enabled()}")
    logger.info(f"Plugin weight: {plugin.get_weight()}")

    # Generate signals for a few test symbols
    test_symbols = ["BHP.AX", "CBA.AX", "RIO.AX"]
    as_of = date.today() - timedelta(days=1)  # Use yesterday to ensure data exists

    logger.info(f"\nGenerating signals for {test_symbols} as of {as_of}...")

    try:
        signals = await plugin.generate_signals(test_symbols, as_of)

        logger.info(f"\nGenerated {len(signals)} signals:")
        for sig in signals[:5]:  # Show first 5
            logger.info(
                f"  {sig.symbol:10s} | {sig.signal:12s} | "
                f"Confidence: {sig.confidence:.2f} | "
                f"Exp Return: {sig.expected_return:+.2%} | "
                f"Rank: {sig.rank}"
            )

    except Exception as e:
        logger.error(f"Signal generation failed: {e}")
        logger.info("Note: This may fail if price data is not available in the database")


async def example_get_single_signal():
    """
    Example: Get signal for a single symbol.
    """
    logger.info("\n" + "=" * 70)
    logger.info("Example 2: Get Single Symbol Signal")
    logger.info("=" * 70)

    plugin = ModelAPlugin()

    symbol = "BHP.AX"
    as_of = date.today() - timedelta(days=1)

    logger.info(f"Getting signal for {symbol} as of {as_of}...")

    try:
        signal = await plugin.get_signal(symbol, as_of)

        if signal:
            logger.info(f"\nSignal for {symbol}:")
            logger.info(f"  Signal: {signal.signal}")
            logger.info(f"  Confidence: {signal.confidence:.2f}")
            logger.info(f"  Expected Return: {signal.expected_return:+.2%}")
            logger.info(f"  Metadata: {signal.metadata}")
        else:
            logger.info(f"No signal found for {symbol}")

    except Exception as e:
        logger.error(f"Failed to get signal: {e}")


async def example_model_explanation():
    """
    Example: Get model explanation (feature importance).
    """
    logger.info("\n" + "=" * 70)
    logger.info("Example 3: Model Explainability")
    logger.info("=" * 70)

    plugin = ModelAPlugin()

    symbol = "BHP.AX"

    logger.info(f"Getting explanation for {symbol}...")

    try:
        explanation = plugin.explain(symbol)

        logger.info(f"\nExplanation type: {explanation.get('explanation_type')}")
        logger.info(f"Source: {explanation.get('source')}")

        features = explanation.get("features", [])
        logger.info(f"\nTop 10 features by importance:")
        for feat in features[:10]:
            logger.info(f"  {feat['name']:30s} | {feat['importance']:.4f}")

    except Exception as e:
        logger.error(f"Failed to get explanation: {e}")


async def example_registry_usage():
    """
    Example: Use ModelRegistry to manage plugins.
    """
    logger.info("\n" + "=" * 70)
    logger.info("Example 4: ModelRegistry Usage")
    logger.info("=" * 70)

    # Load config from YAML
    model_registry.load_config()

    # Register ModelA plugin
    plugin_a = ModelAPlugin()
    model_registry.register(plugin_a)

    logger.info("\nRegistered models:")
    for config in model_registry.get_configs():
        logger.info(
            f"  {config.model_id:15s} | "
            f"Enabled: {config.enabled} | "
            f"Weight: {config.weight_in_ensemble:.2f}"
        )

    logger.info("\nEnabled models:")
    for plugin in model_registry.get_enabled():
        logger.info(f"  {plugin.config.model_id}")

    logger.info("\nEnsemble weights (normalized):")
    weights = model_registry.get_ensemble_weights()
    for model_id, weight in weights.items():
        logger.info(f"  {model_id:15s} | {weight:.2f}")

    # Get model config from YAML
    logger.info("\nModel A config from YAML:")
    config = model_registry.get_model_config("model_a")
    if config:
        logger.info(f"  Description: {config.get('description')}")
        logger.info(f"  Version: {config.get('version')}")
        logger.info(f"  Features: {', '.join(config.get('features', [])[:5])}...")


async def example_ensemble_service():
    """
    Example: Use EnsembleService to aggregate multiple models.

    Note: This requires multiple models to be registered. Currently only
    Model A is implemented, so this will show single-model behavior.
    """
    logger.info("\n" + "=" * 70)
    logger.info("Example 5: EnsembleService (Future)")
    logger.info("=" * 70)

    # Register plugins
    model_registry.load_config()
    plugin_a = ModelAPlugin()
    model_registry.register(plugin_a)

    # Initialize ensemble service
    service = EnsembleService()

    logger.info(f"Ensemble config:")
    logger.info(f"  Strategy: {service.conflict_strategy}")
    logger.info(f"  Min agreement: {service.min_agreement}")
    logger.info(f"  Min confidence: {service.min_confidence}")

    logger.info("\nNote: Ensemble requires multiple models to be registered.")
    logger.info("Once Model B and Model C plugins are implemented, the")
    logger.info("EnsembleService will aggregate their signals automatically.")

    # Example of what ensemble generation would look like:
    # test_symbols = ["BHP.AX", "CBA.AX"]
    # as_of = date.today() - timedelta(days=1)
    # ensemble_signals = await service.generate_ensemble_signals(test_symbols, as_of)


async def main():
    """
    Run all examples.
    """
    logger.info("\n")
    logger.info("=" * 70)
    logger.info("Model Plugin System - Example Usage")
    logger.info("=" * 70)
    logger.info("\nThis script demonstrates the Phase 3 Model Plugin system.")
    logger.info("Make sure you have:")
    logger.info("  1. Trained Model A (run models/train_model_a_ml.py)")
    logger.info("  2. Price data in database (run jobs/run_model_a_job.py)")
    logger.info("\n")

    # Run examples
    await example_model_a_plugin()
    await example_get_single_signal()
    await example_model_explanation()
    await example_registry_usage()
    await example_ensemble_service()

    logger.info("\n" + "=" * 70)
    logger.info("Examples Complete!")
    logger.info("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
