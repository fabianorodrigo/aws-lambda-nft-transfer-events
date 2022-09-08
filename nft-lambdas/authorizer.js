const defaultDenyAllPolicy = {
    principalId: 'user',
    policyDocument: {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: 'Deny',
                Resource: '*',
            },
        ],
    },
};

exports.lambdaAuthHandler = async (event, context) => {
    // Declare Policy
    let iamPolicy = null;
    // Capture raw token and trim 'Bearer ' string, if present
    const token = event.authorizationToken.replace('Bearer ', '');
    console.log('JWT Token', token);
    const methodArn = event.methodArn;

    const scopeClaims = ['email']; // data.claims.scp;
    // Generate IAM Policy
    //iamPolicy = generateIAMPolicy(scopeClaims);

    switch (token) {
        case 'allow':
            return generateAuthResponse('user', 'Allow', methodArn);
        default:
            return defaultDenyAllPolicy;
    }
};

/**
 * Generates a Authorizaer response based on the inputs
 * @param {*} principalId
 * @param {*} effect
 * @param {*} methodArn
 * @returns
 */
function generateAuthResponse(principalId, effect, methodArn) {
    const policyDocument = generatePolicyDocument(effect, methodArn);
    return {
        principalId,
        policyDocument,
    };
}

function generatePolicyDocument(effect, methodArn) {
    if (!effect || !methodArn) return null;
    const policyDocument = {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: methodArn,
            },
        ],
    };
    return policyDocument;
}

// function generateIAMPolicy(scopeClaims) {
//     // Declare empty policy statements array
//     const policyStatements = [];
//     // Iterate over API Permissions
//     for (let i = 0; i < apiPermissions.length; i++) {
//         // Check if token scopes exist in API Permission
//         if (scopeClaims.indexOf(apiPermissions[i].scope) > -1) {
//             // User token has appropriate scope, add API permission to policy statements
//             policyStatements.push(
//                 generatePolicyStatement(
//                     apiPermissions[i].arn,
//                     apiPermissions[i].stage,
//                     apiPermissions[i].httpVerb,
//                     apiPermissions[i].resource,
//                     'Allow',
//                 ),
//             );
//         }
//     }
//     // Check if no policy statements are generated, if so, create default deny all policy statement
//     if (policyStatements.length === 0) {
//         return defaultDenyAllPolicy;
//     } else {
//         return generatePolicy('user', policyStatements);
//     }
// }

// /**
//  * Generate a fully formed IAM policy
//  *
//  * @param {*} principalId
//  * @param {*} policyStatements
//  * @returns
//  */
// function generatePolicy(principalId, policyStatements) {
//     // Generate a fully formed IAM policy
//     const authResponse = {};
//     authResponse.principalId = principalId;
//     const policyDocument = {};
//     policyDocument.Version = '2012-10-17';
//     policyDocument.Statement = policyStatements;
//     authResponse.policyDocument = policyDocument;
//     return authResponse;
// }

// function generatePolicyStatement(apiName, apiStage, apiVerb, apiResource, action) {
//     // Generate an IAM policy statement
//     const statement = {};
//     statement.Action = 'execute-api:Invoke';
//     statement.Effect = action;
//     const methodArn = apiName + '/' + apiStage + '/' + apiVerb + '/' + apiResource;
//     statement.Resource = methodArn;
//     return statement;
// }
