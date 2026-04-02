#!/bin/bash
# setup_aws_backend.sh
# This script provisions the S3 bucket and DynamoDB table implicitly if they don't exist

REGION="us-east-1"
BUCKET_NAME="drishti-terraform-state"
TABLE_NAME="drishti-tfstate-lock"

echo "Checking if S3 bucket $BUCKET_NAME exists..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  echo "✅ Bucket $BUCKET_NAME already exists/you have access."
else
  echo "Creating S3 bucket: $BUCKET_NAME in region $REGION"
  aws s3api create-bucket --bucket $BUCKET_NAME --region $REGION
fi

echo "Enabling S3 bucket versioning..."
aws s3api put-bucket-versioning --bucket $BUCKET_NAME --versioning-configuration Status=Enabled

echo "Enabling S3 bucket encryption..."
aws s3api put-bucket-encryption --bucket $BUCKET_NAME --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'

echo "Applying Public Access Block..."
aws s3api put-public-access-block --bucket $BUCKET_NAME --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "Checking if DynamoDB table $TABLE_NAME exists..."
if aws dynamodb describe-table --table-name "$TABLE_NAME" 2>/dev/null; then
  echo "✅ DynamoDB table $TABLE_NAME already exists."
else
  echo "Creating DynamoDB table for state locking: $TABLE_NAME"
  aws dynamodb create-table \
    --table-name $TABLE_NAME \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION
fi

echo "✅ AWS Backend setup complete!"
