# Salesforce caseMaker

In this example, we will use resin.io to deploy a node.js app that reads a grovePi sensor on the Raspberry Pi, when the reading exceeds a user defined thershold reading, the app creates a case on Salesforce and we will be able to view it in the cases stream.

## Things you will need:

The recipe for this project is as follows:

* Raspberry Pi with ethernet cable for internet connectivity
* A USB -> micro USB cable for power.
* GrovePi Hat and Light sensor

###Setup a resin.io account
1. Go to [resin.io](https://dashboard.resin.io/signup) and sign up for a resin.io account.
1. Setup your public ssh key on git:
  * ```ls -al ~/.ssh```
  * ```ssh-keygen -t rsa -b 4096 -C "your_email@example.com"```
  * ```clip < ~/.ssh/id_rsa.pub```
  * paste it into the box provided on resin.io

2. Resin.io will now ask you to create a new application. Go ahead and do that. Application names can only contain letters [A-z] and numbers [0-9].
3. Once your app is created, download the image. Do not worry about the network connection settings.
4. Burn the image to the SD card with windisk32manager
5. Eject the SD card from your PC and put in the Raspberry pi, make sure the Raspberry pi is connected to the network ethernet cable. We are now ready to power it up.
6. It should now take about a minute to show up on the dashboard.


### Setup Saleforce credentials
1. Sign up for a Developer Edition
 - Go to https://developer.salesforce.com/signup
 - Fill out the form. Note - your username has to look like an email, but it doesn't have to be your email - e.g. I use something@devorg.pat for mine.
 - Look for the 'login confirmation' email. Click the link in the email, set your password and recovery question

In order to authenticate requests from outside of the Salesforce organisation IP range, we will need to get our security token.

1. Getting SF security token
 + Go to your name and click
 + Select My Settings
 + Select Personal
 + Sixth option is "Reset My Security Token"
... you should then get an email with your security token, note it down somewhere because we will use it soon.

2. Now in your newly created app on the resin.io dashboard, Select environmental variables. Here we can create enviroment variables to use in our code running on the raspberry pi. For this app we will need to create one for `SF_USERNAME`, `SF_PASSWORD` and `SF_SEC_TOKEN`. Optionally you can include sample interval and threshold.

You should now be able to click on the "identify device" button and see the little green LED flash. We are now ready to start pushing code...but lets first setup some electronics.

### Salesforce case logging setup

1. Create a connected app; for scope, you'll want 'api'. For our purposes, the callback url doesn't matter, so you can just put http://localhost for that field, and you can leave the logo and icon blank.

2. Create a PushTopic for Case updates

 - Select Your Name | Developer Console.
 - Click Debug | Open Execute Anonymous Window.
 - In the Enter Apex Code window, paste in the following Apex code, and click Execute.

```
PushTopic pushTopic = new PushTopic();
pushTopic.Name = 'CaseUpdates';
pushTopic.Query = 'SELECT Id, Subject FROM Case';
pushTopic.ApiVersion = 31.0;
pushTopic.NotifyForOperationCreate = true;
pushTopic.NotifyForOperationUpdate = true;
pushTopic.NotifyForOperationUndelete = true;
pushTopic.NotifyForOperationDelete = true;
pushTopic.NotifyForFields = 'Referenced';
insert pushTopic;
```

3. Upload streaming.zip (attached) as a Static Resource
 - Setup | Develop | Static Resources
   - Click 'New' (not 'Create New View!')
   - Name: streaming
   - select streaming.zip (attached)
   - change 'Cache Control' to public
   - Hit 'Save'
   - [streaming.zip](https://dl.dropboxusercontent.com/u/9795699/streaming.zip "streaming.zip")

4. Create CaseController and CasePage to show most recent cases
 - Setup | Develop | Apex Classes
 - Hit 'New'
 - Paste in the following code:

```
public class CaseController {
    public List<Case> cases {
        get {
            // Re-run the query every time the page references cases
            // normally we'd do this in the constructor and cache the
            // result in the controller, but we want it to be more
            // dynamic
            return [SELECT Subject, Description
                    FROM Case
                    ORDER BY CreatedDate DESC
                    LIMIT 20];
        }
        set;
    }

    public CaseController() {
    }
}
```

 - Setup | Develop | Pages
 - Hit 'New'
 - Label: CasePage
 - Replace the existing markup with the following:

```
<apex:page controller="CaseController" sidebar="false">
    <apex:includeScript value="{!URLFOR($Resource.streaming, 'cometd.js')}"/>
    <apex:includeScript value="{!URLFOR($Resource.streaming, 'jquery-1.5.1.js')}"/>
    <apex:includeScript value="{!URLFOR($Resource.streaming, 'jquery.cometd.js')}"/>
    <script type="text/javascript">
    (function($){
        $(document).ready(function() {
            // Connect to the CometD endpoint
            $.cometd.init({
               url: window.location.protocol+'//'+window.location.hostname+'/cometd/27.0/',
               requestHeaders: { Authorization: 'OAuth {!$Api.Session_ID}'}
           });

           // Subscribe to a topic. JSON-encoded update will be returned
           // in the callback
           $.cometd.subscribe('/topic/CaseUpdates', function(message) {
               // We don't really care about the update detail - just
               // rerender the list of Cases
               rerenderPageBlock();
           });
        });
    })(jQuery)
    </script>
    <apex:form>
        <apex:actionFunction name="rerenderPageBlock" rerender="pageBlock" />
        <apex:pageBlock id="pageBlock">
            <apex:pageBlockSection title="Case">
                <apex:pageBlockTable value="{!cases}" var="case">
                    <apex:column value="{!case.subject}"/>
                    <apex:column value="{!case.description}"/>
                </apex:pageBlockTable>
            </apex:pageBlockSection>
        </apex:pageBlock>
    </apex:form>
</apex:page>
```

### Connect up the hardware

**Warning: disconnect the raspberry pi for power before connecting the grovePi**

Connect the light sensor to port D0.

### Clone & push
Download this repo, as a ZIP file
Extract it. Then cd into it in the git bash.

```
cd /dreamyDemo/dreamyDemo
``` 

add resin remote by copying it from the dashboard on the top right. 

```
git remote add <users-resin-git-endpoint>
``` 

Then run

```git push resin master```

You should see a bunch of logs scroll on your terminal as your code is cross-compiled in the cloud, this should will take a few minutes, after a successful build you will see a unicorn on your terminal, like this...

![unicorn](/docs/images/unicorn.png)

In the browser, go to https://instance.salesforce.com/apex/CasePage, where instance is whatever prefix is in the URL, e.g. na17. You should see a list of the most recent 20 Cases - fire the web service call again and the page should automatically update.
