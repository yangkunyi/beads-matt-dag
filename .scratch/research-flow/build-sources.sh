#!/usr/bin/env bash
# Build a frozen source pack for the research/DL/dev agent-flow survey.
# Every file starts with the source URL, so notes can cite the file they read.
# Reachable from this machine: github raw, docs sites, HN Algolia, Semantic Scholar,
# OpenAlex, huggingface.co. NOT reachable: arxiv.org, reddit.com, duckduckgo.com.
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)/raw/sources"
mkdir -p "$DIR"
MAN="$DIR/MANIFEST.txt"
: > "$MAN"

fetch() { # fetch <name> <url>
  local name="$1" url="$2" tmp code size
  tmp="$(mktemp)"
  code="$(curl -sL --max-time 30 -o "$tmp" -w '%{http_code}' "$url" 2>/dev/null || echo 000)"
  size="$(wc -c < "$tmp" | tr -d ' ')"
  if [ "$code" != "200" ] || [ "$size" -lt 400 ]; then
    printf 'FAIL %-46s %s %s %s\n' "$name" "$code" "${size}B" "$url" | tee -a "$MAN"
    rm -f "$tmp"
    return 1
  fi
  { printf 'SOURCE-URL: %s\nFETCHED: %s\nHTTP: %s\n\n' "$url" "$(date -Iseconds)" "$code"; cat "$tmp"; } > "$DIR/$name.md"
  printf 'OK   %-46s %s %sB %s\n' "$name" "$code" "$(wc -c < "$DIR/$name.md" | tr -d ' ')" "$url" | tee -a "$MAN"
  rm -f "$tmp"
}

# --- 1. repos: README of each system (raw.githubusercontent avoids HTML noise) -------
repos=(
  "spec-kit|github/spec-kit"
  "openspec|Fission-AI/OpenSpec"
  "beads|steveyegge/beads"
  "bmad-method|bmad-code-org/BMAD-METHOD"
  "ccpm|automazeio/ccpm"
  "superclaude|SuperClaude-Org/SuperClaude_Framework"
  "claude-flow|ruvnet/claude-flow"
  "archon|coleam00/Archon"
  "openhands|All-Hands-AI/OpenHands"
  "swe-agent|SWE-agent/SWE-agent"
  "aide|WecoAI/aideml"
  "ai-scientist|SakanaAI/AI-Scientist"
  "ai-scientist-v2|SakanaAI/AI-Scientist-v2"
  "agent-laboratory|SamuelSchmidgall/AgentLaboratory"
  "mle-bench|openai/mle-bench"
  "frontier-evals|openai/frontier-evals"
  "paper-qa|Future-House/paper-qa"
  "robin|Future-House/robin"
  "aviary|Future-House/aviary"
  "agent-os|buildermethods/agent-os"
  "openai-agents|openai/openai-agents-python"
  "autogen|microsoft/autogen"
)
for entry in "${repos[@]}"; do
  name="${entry%%|*}"; repo="${entry##*|}"
  for br in main master; do
    if fetch "repo-$name" "https://raw.githubusercontent.com/$repo/$br/README.md"; then break; fi
  done
done

# --- 2. vendor docs ----------------------------------------------------------------
fetch "docs-kiro"            "https://kiro.dev/docs/specs/"
fetch "docs-kiro-root"       "https://kiro.dev/"
fetch "docs-mlflow-mcp"      "https://mlflow.org/docs/latest/genai/mcp/"
fetch "docs-mlflow-tracking" "https://mlflow.org/docs/latest/tracking.html"
fetch "docs-wandb-mcp"       "https://docs.wandb.ai/platform/mcp-server"
fetch "docs-wandb-artifacts" "https://docs.wandb.ai/guides/artifacts"
fetch "docs-dvc"             "https://dvc.org/doc"
fetch "docs-hydra"           "https://hydra.cc/docs/intro/"
fetch "docs-slurm"           "https://slurm.schedmd.com/documentation.html"
fetch "docs-skypilot"        "https://docs.skypilot.co/en/latest/docs/index.html"
fetch "docs-github-issues"   "https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues"
fetch "docs-openreview"      "https://openreview.net/"

# --- 3. HN (practitioner reports, reachable via Algolia API) ------------------------
hn_queries=(
  "spec-driven-development"
  "claude-code-subagents"
  "ai-scientist-agent"
  "llm-agent-research-experiments"
  "issue-tracker-coding-agent"
  "beads-issue-tracker"
)
for q in "${hn_queries[@]}"; do
  fetch "hn-$q" "https://hn.algolia.com/api/v1/search?query=$(printf '%s' "$q" | sed 's/-/%20/g')&tags=story&hitsPerPage=8"
done

# --- 4. papers by title via Semantic Scholar (resolves real IDs; no guessing) -------
s2() { # s2 <name> <title>
  local name="$1" q; q="$(printf '%s' "$2" | jq -sRr @uri)"
  fetch "paper-$name" "https://api.semanticscholar.org/graph/v1/paper/search?query=$q&limit=3&fields=title,year,abstract,externalIds,url,citationCount,openAccessPdf,venue"
  sleep 2
}
s2 ai-scientist-v1    "The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery"
s2 ai-scientist-v2    "The AI Scientist-v2 Workshop-Level Automated Scientific Discovery Agentic Tree Search"
s2 aide               "AIDE AI-Driven Exploration in the Space of Code"
s2 mle-bench          "MLE-bench Evaluating Machine Learning Agents on Machine Learning Engineering"
s2 re-bench           "RE-Bench Evaluating frontier AI R&D capabilities of language model agents against human experts"
s2 paperbench         "PaperBench Evaluating AI Ability to Replicate AI Research"
s2 agent-laboratory   "Agent Laboratory Using LLM Agents as Research Assistants"
s2 co-scientist       "Towards an AI co-scientist"
s2 scicode            "SciCode A Research Coding Benchmark Curated by Scientists"
s2 mlgym              "MLGym A New Framework and Benchmark for Advancing AI Research Agents"
s2 core-bench         "CORE-Bench Fostering the Reproducibility of Computational Research"
s2 scienceagentbench  "ScienceAgentBench Rigorous Assessment of Language Agents for Data-Driven Scientific Discovery"
s2 coscientist        "Autonomous chemical research with large language models"
s2 chemcrow           "ChemCrow Augmenting large-language models with chemistry tools"
s2 virtual-lab        "The Virtual Lab AI Agents Design New SARS-CoV-2 Nanobodies Experimental Validation"
s2 funsearch          "Mathematical discoveries from program search with large language models"
s2 alphaevolve        "AlphaEvolve A coding agent for scientific and algorithmic discovery"
s2 a-lab              "An autonomous laboratory for the accelerated synthesis of novel materials"
s2 kosmos             "Kosmos AI scientist multi-agent autonomous discovery"
s2 robin              "Robin multi-agent system autonomous scientific discovery"
s2 paperqa2           "Language agents achieve superhuman synthesis of scientific knowledge"
s2 self-driving-lab   "self-driving laboratory autonomous experimentation review"
s2 repro-ml           "reproducibility machine learning survey empirical study"
s2 hallucination-cite "fabricated citations large language models hallucination study"
s2 research-ideas     "Can LLMs generate novel research ideas human study"
s2 ai-peer-review     "large language models peer review evaluation study"

echo
echo "=== pack summary ==="
grep -c '^OK' "$MAN" | sed 's/^/ok=/'
grep -c '^FAIL' "$MAN" | sed 's/^/fail=/'
