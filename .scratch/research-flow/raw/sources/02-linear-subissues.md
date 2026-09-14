SOURCE-URL: https://linear.app/docs/parent-and-sub-issues
FETCHED: 2026-09-14T17:13:59.888132+08:00
HTTP: 200
NOTE: HTML converted to text by 02 ft.sh (tags stripped); structure approximated.


 Skip to content →

 Docs
 Sign up Open app

 Getting started
 Account
 AI
 Your sidebar
 Teams
 Issues Create issues
 Edit issues
 Assign and delegate issues
 Select issues
 Parent and sub-issues
 Issue templates
 Comments and reactions
 Editor
 Documents
 Delete and archive issues
 Customer Requests
 Releases

 Issue properties
 Projects
 Initiatives
 Cycles
 Views
 Find and filter
 Linear Asks
 Integrations
 Analytics
 Administration
 Importers

 Docs Developers Learn Contact support
 Issues
 Parent and sub-issues

Copy page
 Sign up Open app Parent and sub-issues

 Use sub-issues to break down larger “parent” issues into smaller pieces of work.

 Overview ⁠
 Consider creating sub-issues when a set of work is too large to be a single issue but too small to be a project. Sub-issues are also ideal for splitting up work shared across teammates. When you add a sub-issue to another issue, the other issue becomes its “parent”.
 Create a sub-issue ⁠
 Create a sub-issue by opening the parent issue and clicking the + Add sub-issues button below the issue description. This will launch the sub-issue editor.
 Create sub-issues from the command menu by searching for Create sub-issue , or use Cmd/Ctrl Shift O to open the sub-issue editor. To create multiple sub-issues at once, paste a list of issue titles into the editor or choose Create multiple issues from the command menu.
 When you save a sub-issue, it will automatically launch the editor to create a new one. If you want to create a new one with the same values (labels/assignee etc.) you can press Cmd/Ctrl Shift Enter or Shift-click the save button. Press Esc to exit the sub-issue editor and continue updating the parent issue.

You can turn a comment under an issue into a sub-issue by hovering over a comment and clicking the … menu then “new sub-issue from comment”. Selecting a comment’s text and pressing Cmd/Ctrl Shift O will also create a sub-issue.

If you have a list (bulleted, numbered or checklist) you can highlight the checklist and hit Cmd/Ctrl Shift O to convert to sub-issues or choose the “Create sub-issues(s) from selection” item in the formatting toolbar.

You can add a template using the templates icon when creating a sub-issue or using the command menu under “Create new sub-issue from template” when viewing the parent.
 Copy properties ⁠
 Sub-issues inherit the parent issue’s team, priority, and project. They may also inherit its cycle when created in an active status. Labels are not inherited.
 The assignee is inherited if you are assigned to the parent, or if all existing sub-issues share the parent’s assignee.

You can add sub-issues after saving the parent issue.

You can duplicate a parent and its sub-issues from the Parent’s ... menu under “Duplicate” and hit the toggle “Include sub-issues”.
 Status automation ⁠
 Optionally, configure the following behaviors at the team level (Settings > Team > Workflow) to automate status relations between parent and sub-issues. Status changes triggered by Git integrations will also respect these automations.
 Parent auto-close
 When all sub-issues are marked as done, the parent issue will also be marked as done automatically.
 Sub-issue auto-close
 When the parent issue is marked as done, all remaining sub-issues will also be marked as done.
 Converting issues ⁠
 Turn issues into sub-issues ⁠
 Turn an existing issue(s) into sub-issues of another issue by selecting one or multiple issues and then taking the action to set the parent issue. This action is accessible from the command menu or by pressing Cmd Shift P and selecting a parent issue.
 Turn issues into parent issues ⁠
 To make an existing issue a parent issue of another issue, hover over a sub-issue and take the action “Set Parent” in the contextual menu, command menu or ... menu.
 Turn sub-issues into issues ⁠
 You can turn a sub-issue into a regular issue again using the ⌘/ctrl K menu option “Remove parent”.
 Turn issues into projects ⁠
 Sometimes an issue grows so large it’s more appropriate to turn it into a project instead. To do so, hover over the parent’s ... menu and choose “ Convert to project.” When you convert a parent issue into a project, the original issue and its sub-issues are added to the project as standalone issues. The original issue is renamed to indicate the conversion, and sub-issue relationships are removed.
 Filter sub-issues ⁠
 You can usually set the view to show or hide sub-issues in Display Options. You can also use Filters to show only top-level (parent) issues, issues with sub-issues, or only sub-issues. If you use these filters frequently, consider creating a custom view.

You can also hide completed sub-issues by default under the ... menu and toggling “Always hide completed sub-issues”.

You can also sort your sub-issues under an issue from the … menu and “Order by” though this only updates it for the current user, not globally.
 Display options ⁠
 When looking at sub-issues from the context of their parent issue, you can customize the order of the sub-issues and the properties that display.

 Previous

 Select issues

 Next

 Issue templates

 Overview
 Create a sub-issue
 Copy properties
 Status automation
 Converting issues
 Turn issues into sub-issues
 Turn issues into parent issues
 Turn sub-issues into issues
 Turn issues into projects
 Filter sub-issues
 Display options

