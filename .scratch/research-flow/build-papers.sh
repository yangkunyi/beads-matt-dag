#!/usr/bin/env bash
# Resolve papers by TITLE via the Semantic Scholar graph API, so IDs are never guessed.
# Usage: bash build-papers.sh            (writes raw/sources/paper-<name>.md)
set -uo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)/raw/sources"
mkdir -p "$DIR"
MAN="$DIR/MANIFEST.txt"

s2() { # s2 <name> <title>
  local name="$1" title="$2" q url tmp code size
  q="$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$title")"
  url="https://api.semanticscholar.org/graph/v1/paper/search?query=$q&limit=3&fields=title,year,venue,abstract,externalIds,url,citationCount,openAccessPdf"
  tmp="$(mktemp)"
  code="$(curl -sL --max-time 30 -o "$tmp" -w '%{http_code}' "$url" 2>/dev/null || echo 000)"
  size="$(wc -c < "$tmp" | tr -d ' ')"
  if [ "$code" != "200" ] || [ "$size" -lt 200 ]; then
    printf 'FAIL %-30s %s %sB %s\n' "paper-$name" "$code" "${size}B" "$title" | tee -a "$MAN"
    rm -f "$tmp"; return 1
  fi
  { printf 'SOURCE-URL: %s\nQUERY-TITLE: %s\nFETCHED: %s\n\n' "$url" "$title" "$(date -Iseconds)"; python3 -m json.tool "$tmp" 2>/dev/null || cat "$tmp"; } > "$DIR/paper-$name.md"
  printf 'OK   %-30s %s %sB %s\n' "paper-$name" "$code" "$(wc -c < "$DIR/paper-$name.md" | tr -d ' ')" "$title" | tee -a "$MAN"
  rm -f "$tmp"
  sleep 2
}

s2 ai-scientist-v1    "The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery"
s2 ai-scientist-v2    "The AI Scientist-v2: Workshop-Level Automated Scientific Discovery via Agentic Tree Search"
s2 aide               "AIDE: AI-Driven Exploration in the Space of Code"
s2 mle-bench          "MLE-bench: Evaluating Machine Learning Agents on Machine Learning Engineering"
s2 re-bench           "RE-Bench: Evaluating frontier AI R&D capabilities of language model agents against human experts"
s2 paperbench         "PaperBench: Evaluating AI's Ability to Replicate AI Research"
s2 agent-laboratory   "Agent Laboratory: Using LLM Agents as Research Assistants"
s2 co-scientist       "Towards an AI co-scientist"
s2 scicode            "SciCode: A Research Coding Benchmark Curated by Scientists"
s2 mlgym              "MLGym: A New Framework and Benchmark for Advancing AI Research Agents"
s2 core-bench         "CORE-Bench: Fostering the Reproducibility of Computational Research through an Agentic Framework"
s2 scienceagentbench  "ScienceAgentBench: Toward Rigorous Assessment of Language Agents for Data-Driven Scientific Discovery"
s2 coscientist        "Autonomous chemical research with large language models"
s2 chemcrow           "ChemCrow: Augmenting large-language models with chemistry tools"
s2 virtual-lab        "The Virtual Lab: AI Agents Design New SARS-CoV-2 Nanobodies with Experimental Validation"
s2 funsearch          "Mathematical discoveries from program search with large language models"
s2 alphaevolve        "AlphaEvolve: A coding agent for scientific and algorithmic discovery"
s2 a-lab              "An autonomous laboratory for the accelerated synthesis of novel materials"
s2 kosmos             "Kosmos: an AI scientist for autonomous discovery"
s2 robin              "A multi-agent system for autonomous scientific discovery"
s2 paperqa2           "Language agents achieve superhuman synthesis of scientific knowledge"
s2 self-driving-lab   "Self-driving laboratory autonomous experimentation review"
s2 repro-ml           "Reproducibility in machine learning empirical study survey"
s2 hallucination-cite "Fabricated references hallucinations in scientific writing large language models"
s2 research-ideas     "Can large language models generate novel research ideas human study"
s2 ai-peer-review     "Large language models as peer reviewers evaluation study"
s2 ai-science-crit    "Illusions of understanding in AI-driven research"
s2 agentic-science    "Agentic science autonomous research agents survey verification gap"
echo "=== papers done: ok=$(grep -c '^OK' "$MAN") fail=$(grep -c '^FAIL' "$MAN") (cumulative) ==="
