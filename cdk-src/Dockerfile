FROM public.ecr.aws/lambda/nodejs:18

# Specify file handler
ARG HANDLER_FILE
ARG HANDLER_ENTRY

# Copy files into the lambda working directory 
COPY ${HANDLER_FILE} package.json tsconfig.json  ${LAMBDA_TASK_ROOT}/

# Install NPM dependencies for function
RUN npm install

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD ${HANDLER_ENTRY}
