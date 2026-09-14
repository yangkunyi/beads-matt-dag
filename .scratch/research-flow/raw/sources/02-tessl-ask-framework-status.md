SOURCE-URL: https://docs.tessl.io/introduction-to-tessl/set-up-tessl.md?ask=Does%20Tessl%20still%20ship%20a%20spec-driven%20development%20framework%20where%20specs%20generate%20code%3F
ALSO-VERIFIED: https://docs.tessl.io/introduction-to-tessl/set-up-tessl.md?ask=does-tessl-still-provide-a-spec-driven-development-framework
FETCHED: 2026-09-14T17:19:32+08:00
HTTP: 200
NOTE: GitBook "ask" endpoint response for docs.tessl.io; answers are generated from the docs corpus, quote is from the CLI changelog.

# Does Tessl still provide a spec-driven development framework where specs generate code (the Tessl Framework), or is it now only a skill/plugin registry with review and evaluation?

No—Tessl no longer ships the “spec-driven development framework” where specs generate code (the **Tessl Framework**) as an active product feature.

Tessl’s CLI changelog says that as of **v0.50.3**, **“The Framework functionality is no longer included”** and that if you need the full framework features, **v0.28.0 remains available (though development is paused)**. See the [CLI Changelog](/changelog-cli.md).

What Tessl emphasizes now is **skills/plugins as versioned, installable context**, plus **governance via review and evaluations**:

* **Review** checks that a skill is well-written against quality best practices.
* **Evaluation (`eval`)** measures whether adding a skill actually changes agent behavior, using generated scenarios and baseline-vs-with-skill comparisons (the “proof it changes what the agent does” workflow). See [Prove a skill works using evaluation](/improving-your-skills/evaluate-skill-quality-using-scenarios.md).

So, in current Tessl docs/workflows, it’s effectively a **skill/plugin registry + review/eval** system, not an on-going spec→code generation framework.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What happened to the Tessl Framework?](https://docs.tessl.io?ask=What%20happened%20to%20the%20Tessl%20Framework%3F)
- [How do I run evals now?](https://docs.tessl.io?ask=How%20do%20I%20run%20evals%20now%3F)
- [Where can I publish skills?](https://docs.tessl.io?ask=Where%20can%20I%20publish%20skills%3F)

# Sources:

- [Prove a skill works using evaluation](https://docs.tessl.io/improving-your-skills/evaluate-skill-quality-using-scenarios.md)
- [Improving a skill](https://docs.tessl.io/tutorials/improving-a-skill.md)
- [Glossary](https://docs.tessl.io/reference/glossary.md)
- [Create a skill](https://docs.tessl.io/creating-skills-and-plugins/create-a-skill.md)
- [Using plugins directly from your repo](https://docs.tessl.io/distribute/repository-plugins.md)
- [Using Tessl as a package manager](https://docs.tessl.io/tutorials/using-tessl-as-a-package-manager.md)
- [Create a plugin](https://docs.tessl.io/creating-skills-and-plugins/create-a-plugin.md)
- [Define your own quality standards](https://docs.tessl.io/codifying-and-enforcing-your-skill-standards/define-your-own-quality-standards.md)
- [CLI Changelog](https://docs.tessl.io/changelog-cli.md)
- [Develop and test locally](https://docs.tessl.io/creating-skills-and-plugins/develop-and-test-locally.md)
- [Custom agent setup](https://docs.tessl.io/reference/custom-agent-setup.md)
- [Initialize a repository](https://docs.tessl.io/distribute/initialize-a-repository.md)
- [What is Tessl?](https://docs.tessl.io/overview/readme.md)
- [Open Source Attribution](https://docs.tessl.io/legal/open-source-attribution.md)
- [Connect Tessl to GitLab](https://docs.tessl.io/distribute/connect-tessl-to-gitlab.md)
- [OpenCode](https://docs.tessl.io/reference/custom-agent-setup/opencode.md)
- [Using the Tessl agent](https://docs.tessl.io/use/using-the-tessl-agent.md)

