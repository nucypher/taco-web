#!/bin/bash

sed -i 's|"umbral-pre": "./rust-umbral/umbral-pre-wasm/pkg"|"umbral-pre": "file:./rust-umbral/umbral-pre-wasm/pkg"|g' package.json
