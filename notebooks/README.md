# Model D Validation Notebook

This notebook validates Model D trend and risk analytics against your live database.

## Files
- `notebooks/model_d_validation.ipynb`: trend stability, beta distribution, and factor correlation plots.

## Prerequisites
- `DATABASE_URL` set in your environment.
- Tables present (if missing, the notebook prints guidance):
  - `fundamentals_history` (optional)
  - `features_fundamental_trends` (optional)
  - `prices`

## Run
```bash
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
jupyter notebook notebooks/model_d_validation.ipynb
```

## Outputs
- Trend slope distribution
- Percent change distribution
- Beta distribution (252d proxy)
- Factor correlation heatmap

If the tables are empty, populate them first using the fundamentals history pipeline and rerun.
