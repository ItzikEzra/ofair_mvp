"""S3 service for file uploads and management."""

import sys
import uuid
import logging
from datetime import datetime, timedelta
from typing import Tuple, Optional, Dict, Any
import mimetypes
import hashlib

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from botocore.config import Config

# Add libs to path
sys.path.append("/app/libs")
from python_shared.config.settings import get_settings

logger = logging.getLogger(__name__)


class S3Service:
    """Service for S3 file operations."""
    
    def __init__(self):
        self.settings = get_settings()
        self._client = None
        self._bucket = self.settings.s3_bucket
    
    @property
    def client(self):
        """Get or create S3 client."""
        if self._client is None:
            try:
                config = Config(
                    region_name=self.settings.s3_region,
                    retries={'max_attempts': 3}
                )
                
                # Configure S3 client
                if self.settings.s3_endpoint:
                    # Use custom endpoint (e.g., MinIO)
                    self._client = boto3.client(
                        's3',
                        endpoint_url=self.settings.s3_endpoint,
                        aws_access_key_id=self.settings.s3_access_key,
                        aws_secret_access_key=self.settings.s3_secret_key,
                        config=config
                    )
                else:
                    # Use AWS S3
                    self._client = boto3.client(
                        's3',
                        aws_access_key_id=self.settings.s3_access_key,
                        aws_secret_access_key=self.settings.s3_secret_key,
                        config=config
                    )
                    
                logger.info("S3 client initialized successfully")
                
            except (NoCredentialsError, ClientError) as e:
                logger.error(f"Failed to initialize S3 client: {e}")
                raise
        
        return self._client
    
    def _generate_file_key(
        self, 
        prefix: str, 
        filename: str, 
        professional_id: Optional[uuid.UUID] = None
    ) -> str:
        """Generate secure S3 file key."""
        # Extract file extension
        file_ext = ''
        if '.' in filename:
            file_ext = '.' + filename.split('.')[-1].lower()
        
        # Generate unique identifier
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        
        # Create file key based on type
        if professional_id:
            # Professional-specific files
            key = f"{prefix}/{professional_id}/{timestamp}_{unique_id}{file_ext}"
        else:
            # General files
            key = f"{prefix}/{timestamp}_{unique_id}{file_ext}"
        
        return key
    
    def _get_content_type(self, filename: str) -> str:
        """Get MIME content type for file."""
        content_type, _ = mimetypes.guess_type(filename)
        return content_type or 'application/octet-stream'
    
    def _validate_file_type(self, filename: str, allowed_types: set) -> bool:
        """Validate file type against allowed extensions."""
        if not filename or '.' not in filename:
            return False
        
        file_ext = '.' + filename.lower().split('.')[-1]
        return file_ext in allowed_types
    
    async def generate_certificate_upload_url(
        self,
        professional_id: uuid.UUID,
        filename: str,
        file_type: str,
        expires_in: int = 3600
    ) -> Tuple[str, str]:
        """
        Generate pre-signed URL for certificate upload.
        
        Args:
            professional_id: ID of the professional
            filename: Original filename
            file_type: MIME type of the file
            expires_in: URL expiration time in seconds
            
        Returns:
            Tuple of (upload_url, file_key)
        """
        try:
            # Validate file type
            allowed_types = {'.pdf', '.jpg', '.jpeg', '.png'}
            if not self._validate_file_type(filename, allowed_types):
                raise ValueError(f"Invalid file type. Allowed: {', '.join(allowed_types)}")
            
            # Generate secure file key
            file_key = self._generate_file_key(
                prefix="certificates",
                filename=filename,
                professional_id=professional_id
            )
            
            # Content type validation
            content_type = self._get_content_type(filename)
            if file_type and file_type != content_type:
                logger.warning(f"File type mismatch: provided {file_type}, detected {content_type}")
                content_type = file_type
            
            # Generate pre-signed POST URL for upload
            conditions = [
                {"bucket": self._bucket},
                {"key": file_key},
                {"Content-Type": content_type},
                ["content-length-range", 1, 10 * 1024 * 1024]  # 1 byte to 10MB
            ]
            
            fields = {
                "key": file_key,
                "Content-Type": content_type,
                "x-amz-meta-professional-id": str(professional_id),
                "x-amz-meta-upload-type": "certificate",
                "x-amz-meta-timestamp": datetime.utcnow().isoformat()
            }
            
            response = self.client.generate_presigned_post(
                Bucket=self._bucket,
                Key=file_key,
                Fields=fields,
                Conditions=conditions,
                ExpiresIn=expires_in
            )
            
            upload_url = response['url']
            
            logger.info(f"Generated certificate upload URL for professional {professional_id}")
            return upload_url, file_key
            
        except Exception as e:
            logger.error(f"Error generating certificate upload URL: {e}")
            raise
    
    async def generate_attachment_upload_url(
        self,
        filename: str,
        file_type: str,
        context: str = "general",
        expires_in: int = 3600
    ) -> Tuple[str, str]:
        """
        Generate pre-signed URL for attachment upload.
        
        Args:
            filename: Original filename
            file_type: MIME type of the file
            context: Upload context (e.g., "lead", "proposal")
            expires_in: URL expiration time in seconds
            
        Returns:
            Tuple of (upload_url, file_key)
        """
        try:
            # Validate file type
            allowed_types = {'.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif'}
            if not self._validate_file_type(filename, allowed_types):
                raise ValueError(f"Invalid file type. Allowed: {', '.join(allowed_types)}")
            
            # Generate secure file key
            file_key = self._generate_file_key(
                prefix=f"attachments/{context}",
                filename=filename
            )
            
            # Content type validation
            content_type = self._get_content_type(filename)
            if file_type and file_type != content_type:
                content_type = file_type
            
            # Generate pre-signed POST URL for upload
            conditions = [
                {"bucket": self._bucket},
                {"key": file_key},
                {"Content-Type": content_type},
                ["content-length-range", 1, 25 * 1024 * 1024]  # 1 byte to 25MB
            ]
            
            fields = {
                "key": file_key,
                "Content-Type": content_type,
                "x-amz-meta-upload-type": "attachment",
                "x-amz-meta-context": context,
                "x-amz-meta-timestamp": datetime.utcnow().isoformat()
            }
            
            response = self.client.generate_presigned_post(
                Bucket=self._bucket,
                Key=file_key,
                Fields=fields,
                Conditions=conditions,
                ExpiresIn=expires_in
            )
            
            upload_url = response['url']
            
            logger.info(f"Generated attachment upload URL for context {context}")
            return upload_url, file_key
            
        except Exception as e:
            logger.error(f"Error generating attachment upload URL: {e}")
            raise
    
    async def generate_download_url(
        self,
        file_key: str,
        expires_in: int = 3600
    ) -> str:
        """
        Generate pre-signed URL for file download.
        
        Args:
            file_key: S3 file key
            expires_in: URL expiration time in seconds
            
        Returns:
            Pre-signed download URL
        """
        try:
            # Check if file exists
            try:
                self.client.head_object(Bucket=self._bucket, Key=file_key)
            except ClientError as e:
                if e.response['Error']['Code'] == '404':
                    raise FileNotFoundError(f"File not found: {file_key}")
                raise
            
            # Generate pre-signed URL for download
            download_url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self._bucket, 'Key': file_key},
                ExpiresIn=expires_in
            )
            
            logger.info(f"Generated download URL for file: {file_key}")
            return download_url
            
        except Exception as e:
            logger.error(f"Error generating download URL for {file_key}: {e}")
            raise
    
    async def delete_file(self, file_key: str) -> bool:
        """
        Delete file from S3.
        
        Args:
            file_key: S3 file key
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.client.delete_object(Bucket=self._bucket, Key=file_key)
            logger.info(f"Deleted file: {file_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Error deleting file {file_key}: {e}")
            return False
    
    async def copy_file(
        self,
        source_key: str,
        destination_key: str,
        metadata: Optional[Dict[str, str]] = None
    ) -> bool:
        """
        Copy file within S3 bucket.
        
        Args:
            source_key: Source file key
            destination_key: Destination file key
            metadata: Optional metadata to add
            
        Returns:
            True if successful, False otherwise
        """
        try:
            copy_source = {'Bucket': self._bucket, 'Key': source_key}
            
            extra_args = {}
            if metadata:
                extra_args['Metadata'] = metadata
                extra_args['MetadataDirective'] = 'REPLACE'
            
            self.client.copy_object(
                CopySource=copy_source,
                Bucket=self._bucket,
                Key=destination_key,
                **extra_args
            )
            
            logger.info(f"Copied file from {source_key} to {destination_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Error copying file from {source_key} to {destination_key}: {e}")
            return False
    
    async def get_file_metadata(self, file_key: str) -> Optional[Dict[str, Any]]:
        """
        Get file metadata from S3.
        
        Args:
            file_key: S3 file key
            
        Returns:
            File metadata dict or None if not found
        """
        try:
            response = self.client.head_object(Bucket=self._bucket, Key=file_key)
            
            metadata = {
                'key': file_key,
                'size': response.get('ContentLength', 0),
                'content_type': response.get('ContentType', ''),
                'last_modified': response.get('LastModified'),
                'etag': response.get('ETag', '').strip('"'),
                'metadata': response.get('Metadata', {})
            }
            
            return metadata
            
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return None
            logger.error(f"Error getting metadata for {file_key}: {e}")
            raise
    
    async def list_files(
        self,
        prefix: str,
        max_keys: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        List files with given prefix.
        
        Args:
            prefix: S3 key prefix
            max_keys: Maximum number of keys to return
            
        Returns:
            List of file information dicts
        """
        try:
            response = self.client.list_objects_v2(
                Bucket=self._bucket,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            files = []
            for obj in response.get('Contents', []):
                files.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'],
                    'etag': obj['ETag'].strip('"')
                })
            
            return files
            
        except ClientError as e:
            logger.error(f"Error listing files with prefix {prefix}: {e}")
            raise
    
    def generate_file_hash(self, content: bytes) -> str:
        """Generate SHA-256 hash of file content."""
        return hashlib.sha256(content).hexdigest()
    
    async def health_check(self) -> bool:
        """Check S3 service health."""
        try:
            # Try to list bucket contents (with limit)
            self.client.list_objects_v2(Bucket=self._bucket, MaxKeys=1)
            return True
        except Exception as e:
            logger.error(f"S3 health check failed: {e}")
            return False